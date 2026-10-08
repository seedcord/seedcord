import { REST } from '@discordjs/rest';
import { Bus } from '@seedcord/core';
import { interactionMiddleware, MiddlewareRegistry, SubscriberLoader } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { applicationIdFromToken, SeedcordError, validateDiscordToken } from '@seedcord/errors/internal';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { Envapter } from 'envapt';

import { InteractionDispatcher } from '#src/dispatch/InteractionDispatcher';
import { emptyRouteMaps } from '#src/dispatch/resolve';
import { buildEngine } from '#src/engine';

import type { InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { HttpConfig } from '#interfaces/Config';
import type { Core } from '#interfaces/Core';
import type { EngineParts } from '#src/engine';
import type { RESTOptions } from '@discordjs/rest';
import type { IRateLimiter } from '@seedcord/types';

// the parts both http Seedcord classes share
export class InteractionsBot {
    public readonly rest: REST;
    public readonly rateLimiter: IRateLimiter;
    public readonly bus: Bus;
    public readonly subscribers: SubscriberLoader;
    public readonly interactions: InteractionDispatcher | undefined;

    readonly #host: Core;
    #token?: string;

    constructor(host: Core, config: HttpConfig, restOptions: Partial<RESTOptions> | undefined) {
        this.#host = host;
        this.rest = new REST(restOptions);
        this.rateLimiter = config.store ?? new MemoryRateLimiter();
        this.bus = new Bus(host);
        this.subscribers = new SubscriberLoader(this.bus, config.subscribers.path);

        const interactions = config.bot.interactions;
        this.interactions = interactions.path
            ? new InteractionDispatcher(interactions.path, interactions.middlewares)
            : undefined;
    }

    public get applicationId(): string {
        if (!this.#token) throw new SeedcordError(SeedcordErrorCode.CoreApplicationUnavailable);
        return applicationIdFromToken(this.#token);
    }

    public authenticate(): void {
        this.#token = validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN'));
        this.rest.setToken(this.#token);
    }

    public buildEngine(): EngineParts {
        const maps = this.interactions?.maps ?? emptyRouteMaps();
        const middlewares =
            this.interactions?.middlewares ??
            new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);
        return buildEngine(this.#host, maps, middlewares);
    }
}
