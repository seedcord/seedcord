import { InteractionKind } from '@seedcord/core';
import {
    HandlerLoader,
    interactionMiddleware,
    InteractionMetadataKey,
    InteractionMiddlewareMetadataKey,
    MiddlewareRegistry,
    RouteRegistry
} from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';

import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { InteractionHandler } from '#handlers/interaction/InteractionHandler';
import { InteractionMiddleware } from '#handlers/interaction/InteractionMiddleware';

import type { HandlerConstructor, InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { RouteMaps } from '#src/dispatch/resolve';
import type { MiddlewareKind } from '@seedcord/core';
import type { Initializeable, ContextMenuLeaves } from '@seedcord/core/internal';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';

// hmr swaps entries in these maps while resolve() reads them per request
export class InteractionDispatcher implements Initializeable, HmrAware {
    /** @internal */
    public readonly middlewares = new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);

    /** @internal */
    public readonly logger = new Logger('Interactions', { channel: 'interactions' });

    private readonly routes = new RouteRegistry<HandlerConstructor>();

    public get maps(): RouteMaps {
        return this.routes.maps;
    }

    private isInitialized = false;
    private readonly loader: HandlerLoader<
        HandlerConstructor,
        InteractionMiddlewareConstructor,
        MiddlewareKind,
        string[]
    >;

    constructor(handlersDir: string, middlewaresDir?: string) {
        this.loader = new HandlerLoader({
            handlersDir,
            middlewaresDir,
            middlewares: this.middlewares,
            logger: this.logger,
            isHandler: (value): value is HandlerConstructor => this.isHandler(value),
            isMiddleware: (value): value is InteractionMiddlewareConstructor => this.isMiddleware(value),
            storeHandler: (ctor, from) => this.routes.register(ctor, from),
            removeHandler: (ctor, routeIds) => this.routes.unregister(ctor, routeIds),
            artifactsOf: (ctor) => this.routes.routesOf(ctor)
        });
    }

    /** @internal */
    public async init(): Promise<void> {
        if (this.isInitialized) return;
        this.isInitialized = true;

        await this.loader.load();
        this.reportLoad();
    }

    private reportLoad(): void {
        const { utils } = this.logger;
        const { loadedHandlers, loadedMiddlewares } = this.loader;

        if (loadedMiddlewares.length > 0) {
            utils.block('Loaded middlewares', utils.entries(loadedMiddlewares), 'debug');
        }

        utils.block(
            'Loaded handlers',
            [...utils.entries(loadedHandlers), ...utils.counts({ routes: this.routes.size })],
            'debug'
        );
    }

    /** @internal */
    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.loader.onHmr(event);
    }

    public warnUnhandledRoutes(commandLeaves: Iterable<string>): void {
        this.routes.warnMissing(this.logger, commandLeaves, InteractionKind.Slash, 'Slash route', '@SlashRoute');
    }

    public warnUnhandledContextMenuRoutes(leaves: ContextMenuLeaves): void {
        const { logger, routes } = this;
        routes.warnMissing(
            logger,
            leaves.user,
            InteractionKind.UserContextMenu,
            'User context menu',
            '@ContextMenuRoute'
        );
        routes.warnMissing(
            logger,
            leaves.message,
            InteractionKind.MessageContextMenu,
            'Message context menu',
            '@ContextMenuRoute'
        );
    }

    // a gateway class carries the same core metadata on a different base class
    private isHandler(value: unknown): value is HandlerConstructor {
        if (typeof value !== 'function' || !Reflect.hasMetadata(InteractionMetadataKey, value)) return false;
        return value.prototype instanceof InteractionHandler || value.prototype instanceof AutocompleteHandler;
    }

    private isMiddleware(value: unknown): value is InteractionMiddlewareConstructor {
        if (typeof value !== 'function') return false;
        return (
            value.prototype instanceof InteractionMiddleware &&
            Reflect.hasMetadata(InteractionMiddlewareMetadataKey, value)
        );
    }
}
