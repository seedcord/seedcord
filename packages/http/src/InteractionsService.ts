import { REST } from '@discordjs/rest';
import {
    emptyRouteMaps,
    interactionMiddleware,
    MiddlewareRegistry,
    readBotToken,
    SubscriberLoader
} from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { InteractionDispatcher } from '#src/dispatch/InteractionDispatcher';
import { InteractionEngine } from '#src/InteractionEngine';

import type { InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { HttpConfig } from '#interfaces/Config';
import type { Core } from '#interfaces/Core';
import type { RESTOptions } from '@discordjs/rest';
import type { BotToken } from '@seedcord/errors/internal';

export class InteractionsService {
    public readonly rest: REST;
    public readonly subscribers: SubscriberLoader;
    public readonly interactions: InteractionDispatcher | undefined;

    private token?: BotToken;
    private builtEngine?: InteractionEngine;

    constructor(
        private readonly host: Core,
        config: HttpConfig,
        restOptions: Partial<RESTOptions> | undefined
    ) {
        this.rest = new REST(restOptions);
        this.subscribers = new SubscriberLoader(host.bus, config.subscribers.path);

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

    public get engine(): InteractionEngine {
        if (!this.builtEngine) throw new SeedcordError(SeedcordErrorCode.CoreFetchBeforeStart);
        return this.builtEngine;
    }

    public prepareEngine(publicKey: string): InteractionEngine {
        this.builtEngine ??= this.createEngine(publicKey);
        return this.builtEngine;
    }

    private createEngine(publicKey: string): InteractionEngine {
        const maps = this.interactions?.maps ?? emptyRouteMaps();
        const middlewares =
            this.interactions?.middlewares ??
            new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);
        return new InteractionEngine(this.host, maps, middlewares, publicKey);
    }
}
