import { displayPath } from '@seedcord/errors/internal';

import { FolderExports } from '#hmr/FolderExports';

import type { AnyMiddlewareCtor } from '#decorators/middleware';
import type { PluginRegistry } from '#src/plugin/PluginRegistry';
import type { MiddlewareRegistry } from './MiddlewareRegistry';
import type { Logger } from '@seedcord/logger';
import type { HmrUpdateEvent } from '@seedcord/types';

interface LoadedUnit {
    readonly name: string;
    readonly from: string;
}

interface HandlerLoaderOptions<Handler, Middleware extends AnyMiddlewareCtor, Key extends string> {
    readonly handlersDir: string;
    readonly middlewaresDir: string | undefined;
    readonly middlewares: MiddlewareRegistry<Middleware, Key>;
    readonly plugins: PluginRegistry;
    readonly logger: Logger;
    isHandler(value: unknown): value is Handler;
    isMiddleware(value: unknown): value is Middleware;
    // returns whether the class declared anything to store
    storeHandler(handler: Handler, from: string): boolean;
    removeHandler(handler: Handler): void;
}

export class HandlerLoader<
    Handler extends Parameters<PluginRegistry['assertFreeOn']>[0],
    Middleware extends AnyMiddlewareCtor,
    Key extends string
> {
    public readonly loadedHandlers: LoadedUnit[] = [];
    public readonly loadedMiddlewares: LoadedUnit[] = [];

    private initialLoad = false;
    private readonly handlerFiles: FolderExports<Handler>;
    private readonly middlewareFiles?: FolderExports<Middleware>;

    constructor(private readonly options: HandlerLoaderOptions<Handler, Middleware, Key>) {
        const { handlersDir, middlewaresDir, middlewares, logger } = options;
        this.handlerFiles = new FolderExports({
            dir: handlersDir,
            exclude: middlewaresDir ? [middlewaresDir] : [],
            is: (value): value is Handler => options.isHandler(value),
            register: (handler, file) => this.registerHandler(handler, file),
            unregister: (handler) => options.removeHandler(handler),
            logger
        });
        if (!middlewaresDir) return;
        this.middlewareFiles = new FolderExports({
            dir: middlewaresDir,
            is: (value): value is Middleware => options.isMiddleware(value),
            register: (middleware, file) => this.registerMiddleware(middleware, file),
            unregister: (middleware) => middlewares.unregister(middleware),
            logger
        });
    }

    public async load(): Promise<void> {
        this.initialLoad = true;
        this.loadedHandlers.length = 0;
        this.loadedMiddlewares.length = 0;
        try {
            await this.middlewareFiles?.load();
            await this.handlerFiles.load();
        } finally {
            this.initialLoad = false;
        }
    }

    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.middlewareFiles?.handle(event);
        await this.handlerFiles.handle(event);
    }

    private registerHandler(handler: Handler, file: string): void {
        this.options.plugins.assertFreeOn(handler);
        const from = displayPath(file);
        if (!this.options.storeHandler(handler, from)) return;
        if (this.initialLoad) this.loadedHandlers.push({ name: handler.name, from });
    }

    private registerMiddleware(middleware: Middleware, file: string): void {
        this.options.plugins.assertFreeOn(middleware);
        const registration = this.options.middlewares.register(middleware);
        if (!registration || !this.initialLoad) return;

        // the keys are the only place a dev sees that a middleware is scoped
        const scope = registration.keys
            ? `${registration.priority}, ${registration.keys.join(', ')}`
            : registration.priority;
        this.loadedMiddlewares.push({
            name: `${middleware.name} (${String(scope)})`,
            from: displayPath(file)
        });
    }
}
