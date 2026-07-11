import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { formatFilePath } from '@seedcord/utils';
import chalk from 'chalk';

import type { Logger } from '@seedcord/logger';
import type { HmrUpdateEvent } from '@seedcord/types/internal';

interface HmrStore<THandler, TMiddleware, TArtifacts> {
    fileToHandlers: Map<string, Set<THandler>>;
    fileToMiddlewares: Map<string, Set<TMiddleware>>;
    handlerArtifacts: Map<THandler, TArtifacts>;
}

// justified: units are caller-supplied classes, name is read for log labels only
const displayName = (unit: unknown, fallback: string): string => (unit as { name?: string }).name ?? fallback;

interface HmrModuleHandlerOptions<THandler, TMiddleware = void, TArtifacts = unknown> {
    handlersDir: string;
    middlewaresDir?: string;
    isHandler: (val: unknown) => val is THandler;
    isMiddleware?: (val: unknown) => val is TMiddleware;
    registerHandler: (handler: THandler, file: string) => void;
    registerMiddleware?: (middleware: TMiddleware, file: string) => void;
    unregisterHandler: (handler: THandler, artifacts?: TArtifacts) => void;
    unregisterMiddleware?: (middleware: TMiddleware) => void;
    /** Snapshotted per handler so a rollback re-registers with the same artifacts after the module re-imports. */
    getArtifacts?: (handler: THandler) => TArtifacts;
    logger: Logger;
}

/**
 * Reloads THandler and optional TMiddleware modules on HMR updates.
 *
 * Call `handle()` from your `HmrAware.onHmr()` for standard reload behavior, or write a fully custom `onHmr()` and skip this class.
 *
 * This is only useful during development.
 */
export class HmrModuleHandler<THandler, TMiddleware = void, TArtifacts = unknown> {
    private readonly store: HmrStore<THandler, TMiddleware, TArtifacts>;
    private readonly options: HmrModuleHandlerOptions<THandler, TMiddleware, TArtifacts>;

    constructor(options: HmrModuleHandlerOptions<THandler, TMiddleware, TArtifacts>) {
        // the caller's options object stays unmutated
        this.options = { ...options, logger: options.logger.inChannel('hmr') };

        // no import.meta.hot.data stash needed, a leaf reload never reconstructs the singleton that holds these Maps
        this.store = {
            fileToHandlers: new Map(),
            fileToMiddlewares: new Map(),
            handlerArtifacts: new Map()
        };
    }

    /** Unloads or reloads the modules affected by an {@link HmrUpdateEvent}, scoped to the handler and middleware directories. */
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

        const rollbackEnabled = event.rollback ?? true;
        const filesToReload = affectedModules && affectedModules.length > 0 ? affectedModules : [file];
        const absHandlersDir = resolve(process.cwd(), handlersDir);
        const absMiddlewaresDir = middlewaresDir ? resolve(process.cwd(), middlewaresDir) : null;

        for (const fileToReload of filesToReload) {
            // the separator keeps a sibling dir sharing the prefix (commands-extra vs commands) out
            const isHandler = fileToReload.startsWith(absHandlersDir + sep);
            const isMiddleware = absMiddlewaresDir ? fileToReload.startsWith(absMiddlewaresDir + sep) : false;

            if (!isHandler && !isMiddleware) {
                continue;
            }

            await this.reloadWithRollback(fileToReload, rollbackEnabled);
        }
    }

    private async reloadWithRollback(file: string, rollbackEnabled: boolean): Promise<void> {
        const { logger } = this.options;
        const snapshot = this.snapshotUnits(file);
        this.unload(file);

        const reloaded = await this.reloadFile(file);
        if (reloaded) return;

        // a failed reload can leave a partial registration
        this.unload(file);
        if (!rollbackEnabled) return;

        // a typo keeps them live until the next good save
        this.restoreUnits(file, snapshot);
        logger.warn(`${chalk.yellow.bold('Rolled back')} ${chalk.gray(formatFilePath(file))} to the last-good version`);
    }

    /** Links the handler to its source file so a later update can unload it. */
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

    /** Links the middleware to its source file so a later update can unload it. */
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
                const name = displayName(handler, 'Handler');
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
                const name = displayName(middleware, 'Middleware');
                logger.info(
                    `${chalk.red.bold('Unloaded')} ${chalk.cyan.bold(name)} from ${chalk.gray(formatFilePath(file))}`
                );
            }
            this.store.fileToMiddlewares.delete(file);
        }
    }

    private async reloadFile(file: string): Promise<boolean> {
        const { logger, isHandler, isMiddleware, registerHandler, registerMiddleware } = this.options;

        if (!existsSync(file)) {
            logger.info(`File does not exist, skipping reload: ${formatFilePath(file)}`);
            return false;
        }

        try {
            let fileUrl = pathToFileURL(file).href;
            // vitest has no real vite server managing the module graph, so bust the import cache manually.
            if (process.env.VITEST === 'true') fileUrl += `?update=${Date.now()}`;

            // justified: a dynamic import resolves to an untyped export map
            const imported = (await import(fileUrl)) as Record<string, unknown>;

            for (const val of Object.values(imported)) {
                if (isHandler(val)) {
                    registerHandler(val, file);
                    this.trackHandler(file, val);
                    const name = displayName(val, 'Handler');
                    logger.info(
                        `${chalk.blue.bold('Reloaded')} ${chalk.cyan.bold(name)} from ${chalk.gray(formatFilePath(file))}`
                    );
                } else if (isMiddleware && registerMiddleware && isMiddleware(val)) {
                    registerMiddleware(val, file);
                    this.trackMiddleware(file, val);
                    const name = displayName(val, 'Middleware');
                    logger.info(
                        `${chalk.blue.bold('Reloaded')} ${chalk.cyan.bold(name)} from ${chalk.gray(formatFilePath(file))}`
                    );
                }
            }

            return true;
        } catch (error) {
            logger.error(`Failed to reload file: ${file}`, error);
            return false;
        }
    }

    // restoring re-registers the same class objects, so a live db connection survives rollback
    private snapshotUnits(file: string): { handlers: THandler[]; middlewares: TMiddleware[] } {
        return {
            handlers: [...(this.store.fileToHandlers.get(file) ?? [])],
            middlewares: [...(this.store.fileToMiddlewares.get(file) ?? [])]
        };
    }

    private restoreUnits(file: string, snapshot: { handlers: THandler[]; middlewares: TMiddleware[] }): void {
        for (const handler of snapshot.handlers) {
            this.options.registerHandler(handler, file);
            this.trackHandler(file, handler);
        }

        if (this.options.registerMiddleware) {
            for (const middleware of snapshot.middlewares) {
                this.options.registerMiddleware(middleware, file);
                this.trackMiddleware(file, middleware);
            }
        }
    }
}
