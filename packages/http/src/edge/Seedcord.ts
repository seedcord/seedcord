import {
    BAKED_IDS_KEY,
    bindBotColor,
    connectDevChannel,
    CoordinatedStartup,
    DEV_URL_HEADER,
    forwardLogsToCli,
    HmrManager,
    HostHmr,
    installLinks,
    keepRequestOpenFor,
    PluginLifecycle,
    publicUrl,
    requestScope,
    sealAttachments,
    settleWithin,
    toWireError,
    WORKER_PROBE
} from '@seedcord/core/internal';
import { PluginHost } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, setColorLevel } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { HostAugmentTarget, HostPlugins, HostVersion, SeedcordBrand } from '@seedcord/types/internal';

import { installEmojis } from '#src/emojis/EmojiInjector';
import { HttpStartupTasks } from '#src/HttpStartupTasks';
import { rejectNonPost } from '#src/InteractionEngine';
import { InteractionsService } from '#src/InteractionsService';
import { usernameOf } from '#src/username';
import { version as packageVersion } from '#src/version';

import { edgeRestOptions, edgeShutdown } from './defaults';
import { RequestRest } from './RequestRest';

import type { HttpEdgeConfig } from '#interfaces/Config';
import type { EngineContext } from '#interfaces/EngineContext';
import type { REST } from '@discordjs/rest';
import type { StartupTasks, BakedIds } from '@seedcord/core/internal';
import type { DevChannel, SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';

// the wait has to end within 30s because cloudflare cancels waitUntil work 30s after the response, this timer included
const TIMED_OUT_INIT_WAIT_MS = 25_000;

// seedcord build's worker entry writes these before bot.ts loads
function bakedIds(): BakedIds {
    const ids = Reflect.get(globalThis, Symbol.for(BAKED_IDS_KEY)) as BakedIds | undefined;
    if (!ids) throw new SeedcordError(SeedcordErrorCode.CoreEdgeUnbuilt);
    return ids;
}

// new URL() on a path that starts with // would read it as a host
function atDevPath(incoming: Request, devUrl: string): Request {
    const { pathname, search } = new URL(devUrl, incoming.url);
    const url = new URL(incoming.url);
    url.pathname = pathname;
    url.search = search;
    return new Request(url, incoming);
}

/**
 * The HTTP-interactions bot on Cloudflare Workers. Default-export it from `bot.ts`. Cloudflare
 * calls `fetch` for every request.
 *
 * The constructor stores the config. The first request that needs the bot in each isolate reads
 * the bot token, plus the public key, command ids, and emoji ids that `seedcord build` wrote into
 * the worker. If `DISCORD_BOT_TOKEN` is unset, the token comes from `BOT_TOKEN`. It loads the
 * handler and subscriber folders, then runs the startup tasks and every plugin's `init()` and
 * `ready()`. Requests that arrive meanwhile wait for it.
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

    /**
     * @deprecated Cloudflare Workers don't provide a shutdown hook.
     * @throws A **SeedcordError** with `CoreLifecycleUnavailable` every time you call `addTask`.
     */
    public readonly shutdown = edgeShutdown;

    /** Add a task that runs during startup, on the first request that starts the bot in each isolate. */
    public readonly startup: StartupTasks;

    public readonly config: HttpEdgeConfig;

    readonly #service: InteractionsService;
    readonly #startup = new CoordinatedStartup();
    // workerd gives a worker no shutdown hook. dispose() runs only in a rollback.
    readonly #plugins = new PluginLifecycle(this, this.#startup, { addTask: () => undefined });

    readonly #logger = new Logger('Bot', { channel: 'bot' });
    readonly #underDev: boolean;

    #devUrl?: string;
    #prepared?: Promise<void>;
    #started?: Promise<void> | undefined;

    static #isInstantiated = false;

    constructor(config: HttpEdgeConfig) {
        super('http', 'edge', config.kv);
        if (Seedcord.#isInstantiated) throw new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);
        Seedcord.#isInstantiated = true;

        this.config = config;
        this.startup = { addTask: this.#startup.addTask.bind(this.#startup) };
        bindBotColor(() => this.config.botColor);

        this.#service = new InteractionsService(this, config, new RequestRest(edgeRestOptions(config.bot.restOptions)));
        this.rest = this.#service.rest;

        const cli = connectDevChannel();
        this.#underDev = cli !== undefined;
        if (!cli) return;

        forwardLogsToCli();
        this[HostHmr] = HmrManager.listenTo(cli);
        this.#startWhenAsked(cli);
    }

    #startWhenAsked(cli: DevChannel<SeedcordFrameworkEvents, SeedcordCliEvents>): void {
        const tasks = new HttpStartupTasks(this, this.#service);
        const hmr = this[HostHmr];
        if (hmr) tasks.registerHmr(hmr);
        tasks.addDiscordTasks();
        cli.on('seedcord:start', ({ colorLevel, url }) => {
            setColorLevel(colorLevel);
            this.#devUrl = url;
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
     * The address people reach your bot at, from `server.url` in your config. You only need to set
     * `server.url` if a plugin or your own code reads this.
     *
     * @throws A **SeedcordError** when you read it and you haven't set `server.url` unless `seedcord dev` gave the bot an address.
     * @throws A **SeedcordTypeError** when you read it and `server.url` isn't an http or https address.
     */
    public get url(): URL {
        return publicUrl(this.config.server?.url, this.#devUrl);
    }

    /**
     * Answers one web request: each plugin's `fetch` in attach order, then Discord's interactions.
     * When every plugin passes, the interactions engine gets a POST and anything else gets a 404.
     * Until you attach a plugin with `fetch`, that 404 comes back before the bot starts.
     *
     * Cloudflare passes `env` and `ctx`, but this method reads only `ctx`. Import your bindings as
     * `env` from `cloudflare:workers`. `cf workers types` writes their types. Work that continues
     * after the 202 response runs under `ctx.waitUntil`.
     */
    public async fetch(incoming: Request, _env: unknown, ctx: EngineContext): Promise<Response> {
        if (incoming.headers.has(WORKER_PROBE.header)) return new Response(null, { status: WORKER_PROBE.status });

        // seedcord dev sends every request to / so vite can't serve the bot's source
        const devUrl = this.#underDev ? incoming.headers.get(DEV_URL_HEADER) : null;
        const request = devUrl === null ? incoming : atDevPath(incoming, devUrl);

        // skips starting the bot when only the engine could answer
        const early = this[HostPlugins].answersRequests ? undefined : rejectNonPost(request);
        if (early) return early;

        return requestScope.run(ctx, async () => {
            await this.#start();
            return (await this[HostPlugins].answer(request)) ?? this.#service.engine.handle(request);
        });
    }

    async #start(): Promise<void> {
        const starting = this.#startOnce();
        // if discord disconnects during the first request, workers cancels startup and every later request waits on it forever.
        // waitUntil gets a promise that never rejects. the await below already throws a failed startup
        keepRequestOpenFor(starting.catch(() => undefined));
        await starting;
    }

    async #startOnce(): Promise<void> {
        this.#prepared ??= this.#prepare();
        await this.#prepared;

        this.#started ??= this.#runStartup();
        await this.#started;
    }

    // once per isolate. Running the loaders again would register every subscriber twice
    async #prepare(): Promise<void> {
        // seedcord dev's codegen copy constructs this bot inside the CLI and never starts it
        Logger.configure(this.config.logger ?? {});
        // seal before interactions.init(), which checks handlers against plugin members
        sealAttachments(this);
        // seedcord dev reads the ids from Discord in its startup tasks
        const ids = this.#underDev ? undefined : bakedIds();
        this.#service.authenticate();
        await this.#service.subscribers.init();
        await this.#service.interactions?.init();
        if (!ids) return;
        installLinks(ids);
        installEmojis(ids.emojis);
        this.#service.prepareEngine(ids.publicKey);
    }

    async #runStartup(): Promise<void> {
        this.#plugins.register();
        try {
            await this.#startup.run();
        } catch (caught) {
            await this.#plugins.rollback();
            const oldInits = this.#plugins.timedOutInitsSettled();
            // a retry can't overlap a timed-out init on cloudflare since cloudflare cancels it once its request ends.
            // dev waits it out because seedcord dev starts outside a request and the init never gets cancelled.
            // we tried guarding overlapping inits on one plugin instead and every guard opened a new race. not worth it
            const waited = requestScope.getStore() ? settleWithin(oldInits, TIMED_OUT_INIT_WAIT_MS) : oldInits;
            keepRequestOpenFor(
                waited.then(() => {
                    this.#started = undefined;
                })
            );
            throw caught;
        }
    }

    /** @internal */
    protected static reset(): void {
        Seedcord.#isInstantiated = false;
    }
}
