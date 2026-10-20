import {
    attachmentsOf,
    BAKED_IDS_KEY,
    bindBotColor,
    connectDevChannel,
    CoordinatedStartup,
    forwardLogsToCli,
    HmrManager,
    installLinks,
    PluginLifecycle,
    sealAttachments,
    toWireError
} from '@seedcord/core/internal';
import { PluginHost } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, setColorLevel } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { HostAugmentTarget, HostVersion, SeedcordBrand } from '@seedcord/types/internal';

import { installEmojis } from '#src/emojis/EmojiInjector';
import { rejectNonPost } from '#src/engine';
import { HttpStartupTasks } from '#src/HttpStartupTasks';
import { InteractionsService } from '#src/InteractionsService';
import { usernameOf } from '#src/username';
import { version as packageVersion } from '#src/version';

import { edgeRestOptions, edgeShutdown } from './defaults';

import type { HttpEdgeConfig } from '#interfaces/Config';
import type { EngineContext } from '#src/engine';
import type { REST } from '@discordjs/rest';
import type { Bus } from '@seedcord/core';
import type { BakedIds } from '@seedcord/core/internal';
import type { IRateLimiter } from '@seedcord/types';
import type { DevChannel, SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';

// seedcord build's worker entry writes these before bot.ts loads
function bakedIds(): BakedIds {
    const ids = Reflect.get(globalThis, Symbol.for(BAKED_IDS_KEY)) as BakedIds | undefined;
    if (!ids) throw new SeedcordError(SeedcordErrorCode.CoreEdgeUnbuilt);
    return ids;
}

/**
 * The HTTP-interactions bot on Cloudflare Workers. Default-export it from `bot.ts`. Cloudflare
 * calls `fetch` for every request.
 *
 * The constructor stores the config. The first POST in each isolate reads `DISCORD_BOT_TOKEN`
 * and the public key, command ids, and emoji ids that `seedcord build` wrote into the worker. It
 * loads the handler and subscriber folders, then runs the startup tasks and every plugin's `init()`
 * and `ready()`. Requests that arrive meanwhile wait for it.
 *
 * Under `seedcord dev` the bot starts when the CLI starts it. It reads the public key and emoji
 * ids from Discord and deploys your commands, the way a node bot does.
 */
export class Seedcord extends PluginHost<'http', 'edge'> {
    // the CLI reads these to detect and augment the instance
    /** @internal */
    public readonly [SeedcordBrand] = true;
    /** @internal */
    public readonly [HostAugmentTarget] = '@seedcord/http';
    /** @internal */
    public readonly [HostVersion]: string = packageVersion;

    /** Discord REST client built from `bot.restOptions`, with both sweepers off. */
    public readonly rest: REST;

    /** @see {@link IRateLimiter} */
    public readonly rateLimiter: IRateLimiter;

    /** @see {@link Bus} */
    public readonly bus: Bus;

    /**
     * @deprecated Cloudflare Workers don't provide a shutdown hook.
     * @throws A **SeedcordError** with `CoreLifecycleUnavailable` every time you call `addTask`.
     */
    public readonly shutdown = edgeShutdown;

    /** Add a task that runs during startup, on the first POST. */
    public readonly startup: Pick<CoordinatedStartup, 'addTask'>;

    public readonly config: HttpEdgeConfig;

    readonly #service: InteractionsService;
    readonly #startup = new CoordinatedStartup();
    // workerd gives a worker no shutdown hook. dispose() runs only in a rollback.
    readonly #plugins = new PluginLifecycle(this.#startup, { addTask: () => undefined });

    readonly #hmr = new HmrManager();
    readonly #logger = new Logger('Server', { channel: 'bot' });
    // seedcord dev reads them from Discord in its startup tasks
    readonly #readsBakedIds: boolean;

    #prepared?: Promise<void>;
    #started?: Promise<void> | undefined;

    static #isInstantiated = false;

    constructor(config: HttpEdgeConfig) {
        super('http', 'edge');
        if (Seedcord.#isInstantiated) throw new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);
        Seedcord.#isInstantiated = true;

        this.config = config;
        this.startup = { addTask: this.#startup.addTask.bind(this.#startup) };
        bindBotColor(() => this.config.botColor);

        this.#service = new InteractionsService(this, config, edgeRestOptions(config.bot.restOptions));
        this.rest = this.#service.rest;
        this.rateLimiter = this.#service.rateLimiter;
        this.bus = this.#service.bus;

        const cli = connectDevChannel();
        this.#readsBakedIds = !cli;
        if (cli) {
            forwardLogsToCli();
            this.#startWhenAsked(cli);
        }
        this.#hmr.init(cli);
    }

    #startWhenAsked(cli: DevChannel<SeedcordFrameworkEvents, SeedcordCliEvents>): void {
        const tasks = new HttpStartupTasks(this, this.#service);
        tasks.registerHmr(this.#hmr);
        tasks.addDiscordTasks();
        cli.on('seedcord:start', ({ colorLevel }) => {
            setColorLevel(colorLevel);
            void this.#startForCli(cli);
        });
    }

    async #startForCli(cli: DevChannel<SeedcordFrameworkEvents, SeedcordCliEvents>): Promise<void> {
        try {
            await this.#start();
        } catch (error) {
            cli.send('seedcord:start-failed', { error: toWireError(error) });
            return;
        }
        cli.send('seedcord:started', { username: await usernameOf(this.rest, this.#logger) });
    }

    /** The bot's Discord application id. Throws if you read it before the bot starts. */
    public get applicationId(): string {
        return this.#service.applicationId;
    }

    /**
     * Answers one request to the interactions endpoint. Cloudflare passes `env` and `ctx`, but this
     * method reads only `ctx`. Import your bindings as `env` from `cloudflare:workers`.
     * `cf workers types` writes their types. Work that continues after the 202 response runs under `ctx.waitUntil`. Any request
     * besides a POST gets a 405 before the bot starts.
     */
    public async fetch(request: Request, _env?: unknown, ctx?: EngineContext): Promise<Response> {
        const notPost = rejectNonPost(request);
        if (notPost) return notPost;

        await this.#start();
        return this.#service.engine(request, ctx);
    }

    async #start(): Promise<void> {
        this.#prepared ??= this.#prepare();
        await this.#prepared;

        this.#started ??= this.#runStartup();
        await this.#started;
    }

    // once per isolate. Running the loaders again would register every subscriber twice
    async #prepare(): Promise<void> {
        // seedcord dev's codegen copy constructs this bot inside the CLI and never starts it
        Logger.configure(this.config.logger ?? {});
        const ids = this.#readsBakedIds ? bakedIds() : undefined;
        this.#service.authenticate();
        await this.#service.subscribers.init();
        await this.#service.interactions?.init();
        if (!ids) return;
        installLinks(ids);
        installEmojis(ids.emojis);
        this.#service.prepareEngine(ids.publicKey);
    }

    async #runStartup(): Promise<void> {
        sealAttachments(this);
        this.#plugins.register(attachmentsOf(this));
        try {
            await this.#startup.run();
        } catch (caught) {
            await this.#plugins.rollback();
            this.#plugins.afterTimedOutInits(() => {
                this.#started = undefined;
            });
            throw caught;
        }
    }

    /** @internal */
    protected static reset(): void {
        Seedcord.#isInstantiated = false;
    }
}
