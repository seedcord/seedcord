import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { formatFilePath } from '@seedcord/utils';
import chalk from 'chalk';

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

    private isTracked(file: string): boolean {
        return this.fileToHandlers.has(file) || this.fileToMiddlewares.has(file);
    }

    private unload(file: string): void {
        const { logger } = this.options;
        const handlers = this.fileToHandlers.get(file);
        if (handlers) {
            for (const handler of handlers) {
                this.options.unregisterHandler(handler);
                const name = (handler as { name?: string }).name ?? 'Handler';
                logger.info(
                    `${chalk.red.bold('Unloaded')} ${chalk.cyan.bold(name)} from ${chalk.gray(formatFilePath(file))}`
                );
            }
            this.fileToHandlers.delete(file);
        }

        const middlewares = this.fileToMiddlewares.get(file);
        if (middlewares) {
            for (const middleware of middlewares) {
                this.options.unregisterMiddleware(middleware);
                const name = (middleware as { name?: string }).name ?? 'Middleware';
                logger.info(
                    `${chalk.red.bold('Unloaded')} ${chalk.cyan.bold(name)} from ${chalk.gray(formatFilePath(file))}`
                );
            }
            this.fileToMiddlewares.delete(file);
        }
    }

    private async reloadFile(file: string): Promise<void> {
        const { logger, isHandler, isMiddleware, registerHandler, registerMiddleware } = this.options;

        if (!existsSync(file)) {
            logger.info(`File does not exist, skipping reload: ${formatFilePath(file)}`);
            return;
        }

        try {
            const imported = (await import(file)) as Record<string, unknown>;

            for (const val of Object.values(imported)) {
                if (isHandler(val)) {
                    registerHandler(val, file);
                    this.trackHandler(file, val);
                    const name = (val as { name?: string }).name ?? 'Handler';
                    logger.info(
                        `${chalk.blue.bold('Reloaded')} ${chalk.cyan.bold(name)} from ${chalk.gray(formatFilePath(file))}`
                    );
                } else if (isMiddleware(val)) {
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
