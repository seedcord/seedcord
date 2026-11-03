import { formatFilePath, importFiles } from '@seedcord/utils';
import { Envapter } from 'envapt';

import { HmrModuleHandler } from '#hmr/HmrModuleHandler';

import type { AnyMiddlewareCtor } from '#decorators/middleware';
import type { MiddlewareRegistry } from './MiddlewareRegistry';
import type { Logger } from '@seedcord/logger';
import type { HmrUpdateEvent } from '@seedcord/types';

interface LoadedUnit {
    readonly name: string;
    readonly from: string;
}

interface HandlerLoaderOptions<Handler, Middleware extends AnyMiddlewareCtor, Key extends string, Artifacts> {
    readonly handlersDir: string;
    readonly middlewaresDir: string | undefined;
    readonly middlewares: MiddlewareRegistry<Middleware, Key>;
    readonly logger: Logger;
    isHandler(value: unknown): value is Handler;
    isMiddleware(value: unknown): value is Middleware;
    // returns whether the class declared anything to store
    storeHandler(handler: Handler, from: string): boolean;
    removeHandler(handler: Handler, artifacts?: Artifacts): void;
    artifactsOf(handler: Handler): Artifacts;
}

export class HandlerLoader<
    Handler extends { name: string },
    Middleware extends AnyMiddlewareCtor,
    Key extends string,
    Artifacts
> {
    public readonly loadedHandlers: LoadedUnit[] = [];
    public readonly loadedMiddlewares: LoadedUnit[] = [];

    private initialLoad = false;
    private readonly hmr?: HmrModuleHandler<Handler, Middleware, Artifacts>;

    constructor(private readonly options: HandlerLoaderOptions<Handler, Middleware, Key, Artifacts>) {
        if (!Envapter.isDevelopment && !Envapter.isTest) return;

        const { handlersDir, middlewaresDir, middlewares, logger } = options;
        this.hmr = new HmrModuleHandler({
            handlersDir,
            ...(middlewaresDir && { middlewaresDir }),
            isHandler: (value): value is Handler => options.isHandler(value),
            isMiddleware: (value): value is Middleware => options.isMiddleware(value),
            registerHandler: (handler, file) => this.registerHandler(handler, file),
            registerMiddleware: (middleware, file) => this.registerMiddleware(middleware, file),
            unregisterHandler: (handler, artifacts) => options.removeHandler(handler, artifacts),
            unregisterMiddleware: (middleware) => middlewares.unregister(middleware),
            getArtifacts: (handler) => options.artifactsOf(handler),
            logger
        });
    }

    public async load(): Promise<void> {
        const { handlersDir, middlewaresDir } = this.options;
        this.initialLoad = true;
        this.loadedHandlers.length = 0;
        this.loadedMiddlewares.length = 0;
        try {
            if (middlewaresDir) await this.loadMiddlewares(middlewaresDir);
            await this.loadHandlers(handlersDir);
        } finally {
            this.initialLoad = false;
        }
    }

    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.hmr?.handle(event);
    }

    private async loadHandlers(dir: string): Promise<void> {
        for await (const { fullPath, relativePath, imported } of importFiles(dir)) {
            for (const value of Object.values(imported)) {
                if (!this.options.isHandler(value)) continue;
                this.registerHandler(value, relativePath);
                this.hmr?.trackHandler(fullPath, value);
            }
        }
    }

    private async loadMiddlewares(dir: string): Promise<void> {
        for await (const { fullPath, relativePath, imported } of importFiles(dir)) {
            for (const value of Object.values(imported)) {
                if (!this.options.isMiddleware(value)) continue;
                this.registerMiddleware(value, relativePath);
                this.hmr?.trackMiddleware(fullPath, value);
            }
        }
    }

    private registerHandler(handler: Handler, relativePath: string): void {
        const from = formatFilePath(relativePath);
        if (!this.options.storeHandler(handler, from)) return;
        if (this.initialLoad) this.loadedHandlers.push({ name: handler.name, from });
    }

    private registerMiddleware(middleware: Middleware, relativePath: string): void {
        const registration = this.options.middlewares.register(middleware);
        if (!registration || !this.initialLoad) return;

        // the keys are the only place a dev sees that a middleware is scoped
        const scope = registration.keys
            ? `${registration.priority}, ${registration.keys.join(', ')}`
            : registration.priority;
        this.loadedMiddlewares.push({
            name: `${middleware.name} (${String(scope)})`,
            from: formatFilePath(relativePath)
        });
    }
}
