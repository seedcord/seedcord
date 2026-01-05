import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { formatFilePath } from '@seedcord/utils';
import chalk from 'chalk';

import type { HmrUpdateEvent } from '@seedcord/cli';
import type { Logger } from '@seedcord/services';

interface HmrStore<THandler, TMiddleware, TArtifacts> {
    fileToHandlers: Map<string, Set<THandler>>;
    fileToMiddlewares: Map<string, Set<TMiddleware>>;
    handlerArtifacts: Map<THandler, TArtifacts>;
}

interface HmrData {
    hmr?: Record<string, HmrStore<unknown, unknown, unknown>>;
}

/**
 * Options for configuring the HmrModuleHandler.
 */
export interface HmrModuleHandlerOptions<THandler, TMiddleware = void, TArtifacts = unknown> {
    /** Directory containing handler modules. */
    handlersDir: string;
    /** Directory containing middleware modules. Optional because not all setups use middleware. */
    middlewaresDir?: string;
    /** Function to determine if a value is a handler module of type THandler. */
    isHandler: (val: unknown) => val is THandler;
    /** Function to determine if a value is a middleware module of type TMiddleware. Optional because not all setups use middleware. */
    isMiddleware?: (val: unknown) => val is TMiddleware;
    /** Function to register a handler module. */
    registerHandler: (handler: THandler, file: string) => void;
    /** Function to register a middleware module. Optional because not all setups use middleware. */
    registerMiddleware?: (middleware: TMiddleware, file: string) => void;
    /** Function to unregister a handler module. */
    unregisterHandler: (handler: THandler, artifacts?: TArtifacts) => void;
    /** Function to unregister a middleware module. Optional because not all setups use middleware. */
    unregisterMiddleware?: (middleware: TMiddleware) => void;
    /** Function to extract artifacts from a handler to be stored across hmr cache invalidations. */
    getArtifacts?: (handler: THandler) => TArtifacts;
    /** Logger instance for logging HMR activities.*/
    logger: Logger;
    /** Name of the module handler, used in logging. */
    name: string;
}

/**
 * Handles Hot Module Replacement (HMR) for modules of type THandler and optional TMiddleware.
 *
 * You can either implement a custom `onHmr()` method in your class by extending `HmrAware`, or if it's a plugin, override the existing `onHmr()` with fully custom logic. Or, use this class's `handle()` method inside your `onHmr()` to get standard HMR handling for your modules based on the provided options you give to the constructor.
 */
export class HmrModuleHandler<THandler, TMiddleware = void, TArtifacts = unknown> {
    private readonly store: HmrStore<THandler, TMiddleware, TArtifacts>;

    constructor(private readonly options: HmrModuleHandlerOptions<THandler, TMiddleware, TArtifacts>) {
        options.logger = options.logger.inChannel('hmr');

        if (import.meta.hot) {
            const data = import.meta.hot.data as HmrData;
            data.hmr ??= {};
            this.store = data.hmr[this.options.name] = (data.hmr[this.options.name] as
                | HmrStore<THandler, TMiddleware, TArtifacts>
                | undefined) ?? {
                fileToHandlers: new Map(),
                fileToMiddlewares: new Map(),
                handlerArtifacts: new Map()
            };
        } else {
            this.store = {
                fileToHandlers: new Map(),
                fileToMiddlewares: new Map(),
                handlerArtifacts: new Map()
            };
        }
    }

    /**
     * Handles an HMR update event by reloading affected modules based on the event details and config. It receives an {@link HmrUpdateEvent}, then checks the type of update.
     *
     * - If it's a deletion, it unloads the module.
     * - If it's an update/creation, it checks if the file is tracked, unloads it if so, then reloads the file if it is in the handlers or middlewares directory and is a valid handler/middleware.
     */
    public async handle(event: HmrUpdateEvent): Promise<void> {
        const { file, affectedModules, type } = event;
        const { logger, handlersDir, middlewaresDir } = this.options;

        if (type === 'delete' || type === 'deleteDir') {
            this.unload(file);
            return;
        }

        if (type === 'update' && !existsSync(file)) {
            if (this.isTracked(file)) {
                logger.info(`Received update for non-existent file: ${formatFilePath(file)}, treating as delete`);
                this.unload(file);
            }
            return;
        }

        const filesToReload = affectedModules && affectedModules.length > 0 ? affectedModules : [file];
        const absHandlersDir = resolve(process.cwd(), handlersDir);
        const absMiddlewaresDir = middlewaresDir ? resolve(process.cwd(), middlewaresDir) : null;

        for (const fileToReload of filesToReload) {
            const isHandler = fileToReload.startsWith(absHandlersDir);
            const isMiddleware = absMiddlewaresDir ? fileToReload.startsWith(absMiddlewaresDir) : false;

            if (!isHandler && !isMiddleware) {
                continue;
            }

            // Unload previous exports from this file
            this.unload(fileToReload);

            await this.reloadFile(fileToReload);
        }
    }

    /**
     * Tracks a handler module as being loaded from a specific file.
     * @param file - The file path the handler was loaded from.
     * @param handler - The handler module instance.
     */
    public trackHandler(file: string, handler: THandler): void {
        let set = this.store.fileToHandlers.get(file);
        if (!set) {
            set = new Set();
            this.store.fileToHandlers.set(file, set);
        }
        set.add(handler);

        if (this.options.getArtifacts) {
            const artifacts = this.options.getArtifacts(handler);
            this.store.handlerArtifacts.set(handler, artifacts);
        }
    }

    /**
     * Tracks a middleware module as being loaded from a specific file.
     * @param file - The file path the middleware was loaded from.
     * @param middleware - The middleware module instance.
     */
    public trackMiddleware(file: string, middleware: TMiddleware): void {
        let set = this.store.fileToMiddlewares.get(file);
        if (!set) {
            set = new Set();
            this.store.fileToMiddlewares.set(file, set);
        }
        set.add(middleware);
    }

    private isTracked(file: string): boolean {
        return this.store.fileToHandlers.has(file) || this.store.fileToMiddlewares.has(file);
    }

    private unload(file: string): void {
        const { logger } = this.options;
        const handlers = this.store.fileToHandlers.get(file);
        if (handlers) {
            for (const handler of handlers) {
                const artifacts = this.store.handlerArtifacts.get(handler);
                this.options.unregisterHandler(handler, artifacts);
                this.store.handlerArtifacts.delete(handler);
                const name = (handler as { name?: string }).name ?? 'Handler';
                logger.info(
                    `${chalk.red.bold('Unloaded')} ${chalk.cyan.bold(name)} from ${chalk.gray(formatFilePath(file))}`
                );
            }
            this.store.fileToHandlers.delete(file);
        }

        const middlewares = this.store.fileToMiddlewares.get(file);
        if (middlewares) {
            for (const middleware of middlewares) {
                this.options.unregisterMiddleware?.(middleware);
                const name = (middleware as { name?: string }).name ?? 'Middleware';
                logger.info(
                    `${chalk.red.bold('Unloaded')} ${chalk.cyan.bold(name)} from ${chalk.gray(formatFilePath(file))}`
                );
            }
            this.store.fileToMiddlewares.delete(file);
        }
    }

    private async reloadFile(file: string): Promise<void> {
        const { logger, isHandler, isMiddleware, registerHandler, registerMiddleware } = this.options;

        if (!existsSync(file)) {
            logger.info(`File does not exist, skipping reload: ${formatFilePath(file)}`);
            return;
        }

        try {
            let fileUrl = pathToFileURL(file).href;
            // In the vitest environment, we need to bust the cache manually because
            // we are simulating HMR without a real Vite server handling the module graph updates.
            if (process.env.VITEST === 'true') fileUrl += `?update=${Date.now()}`;

            const imported = (await import(fileUrl)) as Record<string, unknown>;

            for (const val of Object.values(imported)) {
                if (isHandler(val)) {
                    registerHandler(val, file);
                    this.trackHandler(file, val);
                    const name = (val as { name?: string }).name ?? 'Handler';
                    logger.info(
                        `${chalk.blue.bold('Reloaded')} ${chalk.cyan.bold(name)} from ${chalk.gray(formatFilePath(file))}`
                    );
                } else if (isMiddleware && registerMiddleware && isMiddleware(val)) {
                    registerMiddleware(val, file);
                    this.trackMiddleware(file, val);
                    const name = (val as { name?: string }).name ?? 'Middleware';
                    logger.info(
                        `${chalk.blue.bold('Reloaded')} ${chalk.cyan.bold(name)} from ${chalk.gray(formatFilePath(file))}`
                    );
                }
            }
        } catch (error) {
            logger.error(`Failed to reload file: ${file}`, error as Error);
        }
    }
}
