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

import type { HandlerConstructor, HandlerSlots, InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { RouteMaps } from '#src/dispatch/resolve';
import type { MiddlewareKind } from '@seedcord/core';
import type { Initializeable, ContextMenuLeaves, PluginRegistry } from '@seedcord/core/internal';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';

// hmr swaps entries in these maps while resolve() reads them per request
export class InteractionDispatcher implements Initializeable, HmrAware {
    /** @internal */
    public readonly middlewares = new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);

    /** @internal */
    public readonly logger = new Logger('Interactions', { channel: 'interactions' });

    private readonly routes = new RouteRegistry<HandlerSlots>();

    public get maps(): RouteMaps {
        return this.routes.maps;
    }

    private isInitialized = false;
    private readonly loader: HandlerLoader<HandlerConstructor, InteractionMiddlewareConstructor, MiddlewareKind>;

    constructor(plugins: PluginRegistry, handlersDir: string, middlewaresDir?: string) {
        this.loader = new HandlerLoader({
            handlersDir,
            middlewaresDir,
            middlewares: this.middlewares,
            plugins,
            logger: this.logger,
            isHandler: (value): value is HandlerConstructor => this.isHandler(value),
            isMiddleware: (value): value is InteractionMiddlewareConstructor => this.isMiddleware(value),
            storeHandler: (ctor, from) => this.routes.register(ctor, from),
            removeHandler: (ctor) => this.routes.unregister(ctor)
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
        this.routes.warnUnhandledRoutes(this.logger, commandLeaves);
    }

    public warnUnhandledContextMenuRoutes(leaves: ContextMenuLeaves): void {
        this.routes.warnUnhandledContextMenuRoutes(this.logger, leaves);
    }

    // a gateway class has the same core metadata on a different base class
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
