import { resolve } from 'node:path';

import { formatFilePath } from '@seedcord/utils';

import type { HmrUpdateEvent } from '@seedcord/cli';
import type { Logger } from '@seedcord/services';

export interface HmrModuleHandlerOptions<THandler, TMiddleware> {
    handlersDir: string;
    middlewaresDir?: string;
    isHandler: (val: unknown) => val is THandler;
    isMiddleware: (val: unknown) => val is TMiddleware;
    registerHandler: (handler: THandler, file: string) => void;
    registerMiddleware: (middleware: TMiddleware, file: string) => void;
    unregisterHandler: (handler: THandler) => void;
    unregisterMiddleware: (middleware: TMiddleware) => void;
    logger: Logger;
    name: string;
}

export class HmrModuleHandler<THandler, TMiddleware> {
    private readonly fileToHandlers = new Map<string, Set<THandler>>();
    private readonly fileToMiddlewares = new Map<string, Set<TMiddleware>>();

    constructor(private readonly options: HmrModuleHandlerOptions<THandler, TMiddleware>) {}

    public async handle(event: HmrUpdateEvent): Promise<void> {
        const { file, affectedModules, type } = event;
        const { logger, handlersDir, middlewaresDir, name } = this.options;

        logger.inChannel('hmr').info(`[HMR] ${name} update detected: ${formatFilePath(file)}`);

        if (type === 'delete' || type === 'deleteDir') {
            this.unload(file);
            return;
        }

        if (affectedModules && affectedModules.length > 0) {
            logger
                .inChannel('hmr')
                .debug(`[HMR] Affected modules: ${affectedModules.map((f) => formatFilePath(f)).join(', ')}`);
        }

        const filesToReload = affectedModules && affectedModules.length > 0 ? affectedModules : [file];
        const absHandlersDir = resolve(process.cwd(), handlersDir);
        const absMiddlewaresDir = middlewaresDir ? resolve(process.cwd(), middlewaresDir) : null;

        for (const fileToReload of filesToReload) {
            const isHandler = fileToReload.startsWith(absHandlersDir);
            const isMiddleware = absMiddlewaresDir ? fileToReload.startsWith(absMiddlewaresDir) : false;

            if (!isHandler && !isMiddleware) {
                logger
                    .inChannel('hmr')
                    .debug(`Skipping registration for ${formatFilePath(fileToReload)} (not in handler/middleware dir)`);
                continue;
            }

            // Unload previous exports from this file
            this.unload(fileToReload);

            await this.reloadFile(fileToReload);
        }
    }

    public trackHandler(file: string, handler: THandler): void {
        let set = this.fileToHandlers.get(file);
        if (!set) {
            set = new Set();
            this.fileToHandlers.set(file, set);
        }
        set.add(handler);
    }

    public trackMiddleware(file: string, middleware: TMiddleware): void {
        let set = this.fileToMiddlewares.get(file);
        if (!set) {
            set = new Set();
            this.fileToMiddlewares.set(file, set);
        }
        set.add(middleware);
    }

    private unload(file: string): void {
        const handlers = this.fileToHandlers.get(file);
        if (handlers) {
            for (const handler of handlers) {
                this.options.unregisterHandler(handler);
            }
            this.fileToHandlers.delete(file);
        }

        const middlewares = this.fileToMiddlewares.get(file);
        if (middlewares) {
            for (const middleware of middlewares) {
                this.options.unregisterMiddleware(middleware);
            }
            this.fileToMiddlewares.delete(file);
        }
    }

    private async reloadFile(file: string): Promise<void> {
        const { logger, isHandler, isMiddleware, registerHandler, registerMiddleware } = this.options;
        try {
            const imported = (await import(file)) as Record<string, unknown>;

            for (const val of Object.values(imported)) {
                if (isHandler(val)) {
                    registerHandler(val, file);
                    this.trackHandler(file, val);
                    const name = (val as { name?: string }).name ?? 'Handler';
                    logger.utils.registration(name, formatFilePath(file));
                } else if (isMiddleware(val)) {
                    registerMiddleware(val, file);
                    this.trackMiddleware(file, val);
                }
            }
        } catch (error) {
            logger.error(`Failed to reload file: ${file}`, error as Error);
        }
    }
}
