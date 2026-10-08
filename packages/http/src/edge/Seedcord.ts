import { REST } from '@discordjs/rest';
import { Bus } from '@seedcord/core';
import {
    attachmentsOf,
    bindBotColor,
    CoordinatedStartup,
    interactionMiddleware,
    MiddlewareRegistry,
    PluginLifecycle,
    sealAttachments,
    SubscriberLoader
} from '@seedcord/core/internal';
import { PluginHost } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { applicationIdFromToken, SeedcordError, validateDiscordToken } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { HostAugmentTarget, HostVersion, SeedcordBrand } from '@seedcord/types/internal';
import { Envapter } from 'envapt';

import { InteractionDispatcher } from '#src/dispatch/InteractionDispatcher';
import { emptyRouteMaps } from '#src/dispatch/resolve';
import { buildEngine } from '#src/engine';
import { version as packageVersion } from '#src/version';

import { edgeRestOptions, edgeShutdown, edgeStartup } from './runtime';

import type { InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { HttpEdgeConfig } from '#interfaces/Config';
import type { EngineContext, EngineParts } from '#src/engine';
import type { IRateLimiter } from '@seedcord/types';

/**
 * The HTTP-interactions bot on Cloudflare Workers. Default-export it from `bot.ts`. Cloudflare
 * calls `fetch` for every request.
 *
 * The constructor stores the config. The first `fetch` in each isolate reads `DISCORD_BOT_TOKEN`
 * and `DISCORD_PUBLIC_KEY`, loads the handler and subscriber folders, then runs every plugin's
 * `init()` and `ready()`. Requests that arrive meanwhile wait for it.
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

    /** Throws `CoreLifecycleUnavailable`. An isolate runs no coordinated shutdown. */
    public readonly shutdown = edgeShutdown;

    /** Throws `CoreLifecycleUnavailable`. Do startup work inside a plugin's `init()`. */
    public readonly startup = edgeStartup;

    public readonly config: HttpEdgeConfig;

    readonly #subscribers: SubscriberLoader;
    readonly #interactions?: InteractionDispatcher;

    readonly #pluginStartup = new CoordinatedStartup();
    // an isolate never shuts down. dispose() runs only in a rollback.
    readonly #plugins = new PluginLifecycle(this.#pluginStartup, { addTask: () => undefined });

    #token?: string;
    #prepared?: Promise<EngineParts['handle']>;
    #pluginsStarted?: Promise<void> | undefined;

    static #isInstantiated = false;

    constructor(config: HttpEdgeConfig) {
        super('http', 'edge');
        if (Seedcord.#isInstantiated) throw new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);
        Seedcord.#isInstantiated = true;

        this.config = config;
        this.rest = new REST(edgeRestOptions(config.bot.restOptions));
        Logger.configure(config.logger ?? {});
        bindBotColor(() => this.config.botColor);

        this.rateLimiter = config.store ?? new MemoryRateLimiter();
        this.bus = new Bus(this);
        this.#subscribers = new SubscriberLoader(this.bus, config.subscribers.path);

        const interactions = config.bot.interactions;
        if (interactions.path) {
            this.#interactions = new InteractionDispatcher(interactions.path, interactions.middlewares);
        }
    }

    /** The bot's Discord application id. Throws if you read it before the first request. */
    public get applicationId(): string {
        if (!this.#token) throw new SeedcordError(SeedcordErrorCode.CoreApplicationUnavailable);
        return applicationIdFromToken(this.#token);
    }

    /**
     * Answers one request to the interactions endpoint. Cloudflare passes `env` and `ctx`. Work past
     * the 202 runs under `ctx.waitUntil`.
     */
    public async fetch(request: Request, _env?: unknown, ctx?: EngineContext): Promise<Response> {
        this.#prepared ??= this.#prepare();
        const handle = await this.#prepared;

        this.#pluginsStarted ??= this.#startPlugins();
        await this.#pluginsStarted;

        return handle(request, ctx);
    }

    async #prepare(): Promise<EngineParts['handle']> {
        this.#token = validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN'));
        this.rest.setToken(this.#token);

        await this.#subscribers.init();
        await this.#interactions?.init();

        const maps = this.#interactions?.maps ?? emptyRouteMaps();
        const middlewares =
            this.#interactions?.middlewares ??
            new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);
        return buildEngine(this, maps, middlewares).handle;
    }

    async #startPlugins(): Promise<void> {
        this.#plugins.register(attachmentsOf(this));
        try {
            await this.#pluginStartup.run();
        } catch (caught) {
            await this.#plugins.rollback();
            this.#pluginsStarted = undefined;
            throw caught;
        }
        sealAttachments(this);
    }

    /** @internal */
    protected static reset(): void {
        Seedcord.#isInstantiated = false;
    }
}
