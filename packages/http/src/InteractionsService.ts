import { REST } from '@discordjs/rest';
import { Bus } from '@seedcord/core';
import { interactionMiddleware, MiddlewareRegistry, readBotToken, SubscriberLoader } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { InteractionDispatcher } from '#src/dispatch/InteractionDispatcher';
import { emptyRouteMaps } from '#src/dispatch/resolve';
import { buildEngine } from '#src/engine';

import type { InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { HttpConfig } from '#interfaces/Config';
import type { Core } from '#interfaces/Core';
import type { Engine } from '#src/engine';
import type { RESTOptions } from '@discordjs/rest';
import type { BotToken } from '@seedcord/errors/internal';

export class InteractionsService {
    public readonly rest: REST;
    public readonly bus: Bus;
    public readonly subscribers: SubscriberLoader;
    public readonly interactions: InteractionDispatcher | undefined;

    private token?: BotToken;
    private builtEngine?: Engine;

    constructor(
        private readonly host: Core,
        config: HttpConfig,
        restOptions: Partial<RESTOptions> | undefined
    ) {
        this.rest = new REST(restOptions);
        this.bus = new Bus(host);
        this.subscribers = new SubscriberLoader(this.bus, config.subscribers.path);

        const interactions = config.bot.interactions;
        this.interactions = interactions.path
            ? new InteractionDispatcher(interactions.path, interactions.middlewares)
            : undefined;
    }

    public get applicationId(): string {
        if (!this.token) throw new SeedcordError(SeedcordErrorCode.CoreApplicationUnavailable);
        return this.token.applicationId;
    }

    public authenticate(): void {
        this.token = readBotToken();
        this.rest.setToken(this.token.value);
    }

    public get engine(): Engine {
        if (!this.builtEngine) throw new SeedcordError(SeedcordErrorCode.CoreFetchBeforeStart);
        return this.builtEngine;
    }

    public prepareEngine(publicKey: string): Engine {
        this.builtEngine ??= this.createEngine(publicKey);
        return this.builtEngine;
    }

    private createEngine(publicKey: string): Engine {
        const maps = this.interactions?.maps ?? emptyRouteMaps();
        const middlewares =
            this.interactions?.middlewares ??
            new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);
        return buildEngine(this.host, maps, middlewares, publicKey);
    }
}
