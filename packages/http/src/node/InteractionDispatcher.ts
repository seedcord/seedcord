import { InteractionKind } from '@seedcord/core';
import { HmrModuleHandler } from '@seedcord/core/hmr';
import {
    interactionMiddleware,
    InteractionMetadataKey,
    InteractionMiddlewareMetadataKey,
    MiddlewareRegistry
} from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { formatFilePath } from '@seedcord/utils';
import { traverseDirectory } from '@seedcord/utils/node';
import { Envapter } from 'envapt';

import { RouteRegistry } from '#src/dispatch/RouteRegistry';
import { isHandlerClass, isMiddlewareClass } from '#src/manifest/entries';

import type { HandlerConstructor, InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { RouteMap, RouteMaps } from '#src/dispatch/resolve';
import type { Initializeable, ContextMenuLeaves } from '@seedcord/core/internal';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';

// hmr swaps entries in these maps while resolve() reads them per request
export class InteractionDispatcher implements Initializeable, HmrAware {
    /** @internal */
    public readonly middlewares = new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);

    /** @internal */
    public readonly logger = new Logger('Interactions', { channel: 'interactions' });

    private readonly routes = new RouteRegistry();

    public get maps(): RouteMaps {
        return this.routes.maps;
    }

    private isInitialized = false;
    private readonly hmrHandler?: HmrModuleHandler<HandlerConstructor, InteractionMiddlewareConstructor, string[]>;

    private loading = false;
    private readonly loadedHandlers: { name: string; from: string }[] = [];
    private readonly loadedMiddlewares: { name: string; from: string }[] = [];

    constructor(
        private readonly handlersDir: string,
        private readonly middlewaresDir?: string
    ) {
        if (!Envapter.isDevelopment && !Envapter.isTest) return;

        this.hmrHandler = new HmrModuleHandler({
            handlersDir,
            ...(middlewaresDir && { middlewaresDir }),
            isHandler: this.isHandler.bind(this),
            isMiddleware: this.isMiddleware.bind(this),
            registerHandler: this.registerHandler.bind(this),
            registerMiddleware: this.registerMiddleware.bind(this),
            unregisterHandler: this.routes.unregister.bind(this.routes),
            unregisterMiddleware: this.unregisterMiddleware.bind(this),
            getArtifacts: this.routes.routesOf.bind(this.routes),
            logger: this.logger
        });
    }

    /** @internal */
    public async init(): Promise<void> {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.loading = true;
        this.loadedHandlers.length = 0;
        this.loadedMiddlewares.length = 0;
        try {
            if (this.middlewaresDir) await this.loadMiddlewares(this.middlewaresDir);
            await this.loadHandlers(this.handlersDir);
        } finally {
            this.loading = false;
        }

        this.reportLoad();
    }

    private async loadHandlers(dir: string): Promise<void> {
        await traverseDirectory(dir, (fullPath, relativePath, imported) => {
            for (const value of Object.values(imported)) {
                if (!this.isHandler(value)) continue;
                this.registerHandler(value, relativePath);
                this.hmrHandler?.trackHandler(fullPath, value);
            }
        });
    }

    private async loadMiddlewares(dir: string): Promise<void> {
        await traverseDirectory(dir, (fullPath, relativePath, imported) => {
            for (const value of Object.values(imported)) {
                if (!this.isMiddleware(value)) continue;
                this.registerMiddleware(value, relativePath);
                this.hmrHandler?.trackMiddleware(fullPath, value);
            }
        });
    }

    private reportLoad(): void {
        const { utils } = this.logger;

        if (this.loadedMiddlewares.length > 0) {
            utils.block('Loaded middlewares', utils.entries(this.loadedMiddlewares), 'debug');
        }

        utils.block(
            'Loaded handlers',
            [...utils.entries(this.loadedHandlers), ...utils.counts({ routes: this.routes.size })],
            'debug'
        );
    }

    /** @internal */
    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.hmrHandler?.handle(event);
    }

    public warnUnhandledRoutes(commandLeaves: Iterable<string>): void {
        this.warnMissing(commandLeaves, this.maps[InteractionKind.Slash], 'Slash route', '@SlashRoute');
    }

    public warnUnhandledContextMenuRoutes(leaves: ContextMenuLeaves): void {
        const user = this.maps[InteractionKind.UserContextMenu];
        const message = this.maps[InteractionKind.MessageContextMenu];
        this.warnMissing(leaves.user, user, 'User context menu', '@ContextMenuRoute');
        this.warnMissing(leaves.message, message, 'Message context menu', '@ContextMenuRoute');
    }

    private warnMissing(names: Iterable<string>, map: RouteMap, label: string, decorator: string): void {
        for (const name of names) {
            if (map.has(name)) continue;
            this.logger.warn(`${label} ${paint.sky.bold(name)} has no registered ${paint.bold(decorator)} handler.`);
        }
    }

    private isHandler(value: unknown): value is HandlerConstructor {
        return isHandlerClass(value) && Reflect.hasMetadata(InteractionMetadataKey, value);
    }

    private isMiddleware(value: unknown): value is InteractionMiddlewareConstructor {
        return isMiddlewareClass(value) && Reflect.hasMetadata(InteractionMiddlewareMetadataKey, value);
    }

    private registerMiddleware(ctor: InteractionMiddlewareConstructor, relativePath: string): void {
        const metadata = this.middlewares.register(ctor);
        if (!metadata || !this.loading) return;

        // the kinds are the only place a dev sees that a middleware is scoped
        const scope = metadata.keys ? `${metadata.priority}, ${metadata.keys.join(', ')}` : metadata.priority;
        this.loadedMiddlewares.push({
            name: `${ctor.name} (${String(scope)})`,
            from: formatFilePath(relativePath)
        });
    }

    private unregisterMiddleware(ctor: InteractionMiddlewareConstructor): void {
        this.middlewares.unregister(ctor);
    }

    private registerHandler(ctor: HandlerConstructor, relativePath: string): void {
        const from = formatFilePath(relativePath);
        if (!this.routes.register(ctor, from)) return;
        if (this.loading) this.loadedHandlers.push({ name: ctor.name, from });
    }
}
