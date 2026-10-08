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
import type { Engine } from '#src/engine';
import type { RESTOptions } from '@discordjs/rest';
import type { IRateLimiter } from '@seedcord/types';

export class InteractionsService {
    public readonly rest: REST;
    public readonly rateLimiter: IRateLimiter;
    public readonly bus: Bus;
    public readonly subscribers: SubscriberLoader;
    public readonly interactions: InteractionDispatcher | undefined;

    private token?: string;
    private builtEngine?: Engine;

    constructor(
        private readonly host: Core,
        config: HttpConfig,
        restOptions: Partial<RESTOptions> | undefined
    ) {
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
        if (!this.token) throw new SeedcordError(SeedcordErrorCode.CoreApplicationUnavailable);
        return applicationIdFromToken(this.token);
    }

    public authenticate(): void {
        this.token = validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN'));
        this.rest.setToken(this.token);
    }

    public get engine(): Engine {
        if (!this.builtEngine) throw new SeedcordError(SeedcordErrorCode.CoreFetchBeforeStart);
        return this.builtEngine;
    }

    public prepareEngine(): Engine {
        this.builtEngine ??= this.createEngine();
        return this.builtEngine;
    }

    private createEngine(): Engine {
        const maps = this.interactions?.maps ?? emptyRouteMaps();
        const middlewares =
            this.interactions?.middlewares ??
            new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);
        return buildEngine(this.host, maps, middlewares);
    }
}
