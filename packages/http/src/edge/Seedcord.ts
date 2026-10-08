import {
    attachmentsOf,
    bindBotColor,
    CoordinatedStartup,
    PluginLifecycle,
    sealAttachments
} from '@seedcord/core/internal';
import { PluginHost } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { HostAugmentTarget, HostVersion, SeedcordBrand } from '@seedcord/types/internal';

import { InteractionsBot } from '#src/InteractionsBot';
import { version as packageVersion } from '#src/version';

import { edgeRestOptions, edgeShutdown } from './runtime';

import type { HttpEdgeConfig } from '#interfaces/Config';
import type { EngineContext, EngineParts } from '#src/engine';
import type { REST } from '@discordjs/rest';
import type { Bus } from '@seedcord/core';
import type { IRateLimiter } from '@seedcord/types';

/**
 * The HTTP-interactions bot on Cloudflare Workers. Default-export it from `bot.ts`. Cloudflare
 * calls `fetch` for every request.
 *
 * The constructor stores the config. The first `fetch` in each isolate reads `DISCORD_BOT_TOKEN`
 * and `DISCORD_PUBLIC_KEY`, loads the handler and subscriber folders, then runs the startup tasks
 * and every plugin's `init()` and `ready()`. Requests that arrive meanwhile wait for it.
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

    /** Throws `CoreLifecycleUnavailable`. Cloudflare gives a worker no shutdown hook. */
    public readonly shutdown = edgeShutdown;

    /** Add a task that runs during startup, on the first request. */
    public readonly startup: Pick<CoordinatedStartup, 'addTask'>;

    public readonly config: HttpEdgeConfig;

    readonly #bot: InteractionsBot;
    readonly #startup = new CoordinatedStartup();
    // workerd gives a worker no shutdown hook. dispose() runs only in a rollback.
    readonly #plugins = new PluginLifecycle(this.#startup, { addTask: () => undefined });

    #prepared?: Promise<EngineParts['handle']>;
    #started?: Promise<void> | undefined;

    static #isInstantiated = false;

    constructor(config: HttpEdgeConfig) {
        super('http', 'edge');
        if (Seedcord.#isInstantiated) throw new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);
        Seedcord.#isInstantiated = true;

        this.config = config;
        this.startup = { addTask: this.#startup.addTask.bind(this.#startup) };
        Logger.configure(config.logger ?? {});
        bindBotColor(() => this.config.botColor);

        this.#bot = new InteractionsBot(this, config, edgeRestOptions(config.bot.restOptions));
        this.rest = this.#bot.rest;
        this.rateLimiter = this.#bot.rateLimiter;
        this.bus = this.#bot.bus;
    }

    /** The bot's Discord application id. Throws if you read it before the first request. */
    public get applicationId(): string {
        return this.#bot.applicationId;
    }

    /**
     * Answers one request to the interactions endpoint. Cloudflare passes `env` and `ctx`. Work past
     * the 202 runs under `ctx.waitUntil`.
     */
    public async fetch(request: Request, _env?: unknown, ctx?: EngineContext): Promise<Response> {
        this.#prepared ??= this.#prepare();
        const handle = await this.#prepared;

        this.#started ??= this.#runStartup();
        await this.#started;

        return handle(request, ctx);
    }

    async #prepare(): Promise<EngineParts['handle']> {
        this.#bot.authenticate();
        await this.#bot.subscribers.init();
        await this.#bot.interactions?.init();
        return this.#bot.buildEngine().handle;
    }

    async #runStartup(): Promise<void> {
        this.#plugins.register(attachmentsOf(this));
        try {
            await this.#startup.run();
        } catch (caught) {
            await this.#plugins.rollback();
            this.#started = undefined;
            throw caught;
        }
        sealAttachments(this);
    }

    /** @internal */
    protected static reset(): void {
        Seedcord.#isInstantiated = false;
    }
}
