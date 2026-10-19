import { pathToFileURL } from 'node:url';

import { paint } from '@seedcord/errors';
import { formatFilePath } from '@seedcord/utils';
import { botFolder, vitePluginThrew } from '@seedcord/utils/internal';

import type { Logger } from '@seedcord/logger';
import type { HmrUpdateEvent } from '@seedcord/types';

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
        this.options = { ...options, logger: options.logger.inChannel('hmr') };

        // no import.meta.hot.data stash needed because a leaf reload never reconstructs the singleton
        // holding these Maps
        this.store = {
            fileToHandlers: new Map(),
            fileToMiddlewares: new Map(),
            handlerArtifacts: new Map()
        };
    }

    /** Unloads or reloads the modules affected by an {@link HmrUpdateEvent}, scoped to the handler and middleware directories. */
    public async handle(event: HmrUpdateEvent): Promise<void> {
        const { file, affectedModules, type } = event;

        if (type === 'delete' || type === 'deleteDir') {
            this.report('Unloaded', this.unload(file), [file]);
            return;
        }

        // a directory is never importable. its files arrive as their own create events
        if (type === 'createDir') return;

        const rollbackEnabled = event.rollback ?? true;
        const filesToReload = affectedModules && affectedModules.length > 0 ? affectedModules : [file];

        const startedAt = Date.now();
        const names: string[] = [];
        const touched: string[] = [];

        for (const fileToReload of filesToReload) {
            if (!this.inScope(fileToReload)) continue;

            const reloaded = await this.reloadWithRollback(fileToReload, rollbackEnabled);
            if (reloaded.length === 0) continue;

            names.push(...reloaded);
            touched.push(fileToReload);
        }

        this.report(type === 'create' ? 'Registered' : 'Reloaded', names, touched, Date.now() - startedAt);
    }

    private inScope(file: string): boolean {
        const { handlersDir, middlewaresDir } = this.options;

        if (botFolder(handlersDir).holdsModule(file)) return true;
        return middlewaresDir ? botFolder(middlewaresDir).holdsModule(file) : false;
    }

    // one line per save, since one edit can reload every module that imports the file
    private report(verb: string, names: string[], files: string[], elapsedMs?: number): void {
        if (names.length === 0) return;

        const from = files.length === 1 ? formatFilePath(files[0] ?? '') : `${String(files.length)} files`;
        const timing = elapsedMs === undefined ? '' : ` ${paint.mute('in')} ${String(elapsedMs)}ms`;
        this.options.logger.debug(`${verb} ${paint.sky.bold(names.join(', '))} from ${paint.mute(from)}${timing}`);
    }

    private async reloadWithRollback(file: string, rollbackEnabled: boolean): Promise<string[]> {
        const { logger } = this.options;
        const snapshot = this.snapshotUnits(file);
        this.unload(file);

        const reloaded = await this.reloadFile(file);
        if (reloaded !== null) return reloaded;

        // a failed reload can leave a partial registration
        this.unload(file);
        if (!rollbackEnabled) return [];
        if (snapshot.handlers.length === 0 && snapshot.middlewares.length === 0) return [];

        // a typo keeps the last-good units live until the next good save
        this.restoreUnits(file, snapshot);
        logger.warn(`${paint.amber.bold('Rolled back')} ${paint.mute(formatFilePath(file))} to the last-good version`);
        return [];
    }

    /** Links the handler to its source file so a later update can unload it. */
    public trackHandler(file: string, handler: THandler): void {
        let set = this.store.fileToHandlers.get(file);
        if (!set) {
            set = new Set();
            this.store.fileToHandlers.set(file, set);
        }
        set.add(handler);

        if (!this.options.getArtifacts) return;
        this.store.handlerArtifacts.set(handler, this.options.getArtifacts(handler));
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

    private unload(file: string): string[] {
        const names: string[] = [];
        const handlers = this.store.fileToHandlers.get(file);
        if (handlers) {
            for (const handler of handlers) {
                const artifacts = this.store.handlerArtifacts.get(handler);
                this.options.unregisterHandler(handler, artifacts);
                this.store.handlerArtifacts.delete(handler);
                names.push(displayName(handler, 'Handler'));
            }
            this.store.fileToHandlers.delete(file);
        }

        const middlewares = this.store.fileToMiddlewares.get(file);
        if (middlewares) {
            for (const middleware of middlewares) {
                this.options.unregisterMiddleware?.(middleware);
                names.push(displayName(middleware, 'Middleware'));
            }
            this.store.fileToMiddlewares.delete(file);
        }

        return names;
    }

    private async reloadFile(file: string): Promise<string[] | null> {
        const { logger, isHandler, isMiddleware, registerHandler, registerMiddleware } = this.options;

        try {
            let fileUrl = pathToFileURL(file).href;
            // vitest has no real vite server managing the module graph
            if (process.env.VITEST === 'true') fileUrl += `?update=${Date.now()}`;

            // justified: a dynamic import resolves to an untyped export map
            const imported = (await import(/* @vite-ignore */ fileUrl)) as Record<string, unknown>;

            const names: string[] = [];
            for (const val of Object.values(imported)) {
                if (isHandler(val)) {
                    registerHandler(val, file);
                    this.trackHandler(file, val);
                    names.push(displayName(val, 'Handler'));
                } else if (isMiddleware && registerMiddleware && isMiddleware(val)) {
                    registerMiddleware(val, file);
                    this.trackMiddleware(file, val);
                    names.push(displayName(val, 'Middleware'));
                }
            }

            return names;
        } catch (error) {
            logger.error(`Failed to reload file: ${formatFilePath(file)}`, vitePluginThrew(error) ?? error);
            return null;
        }
    }

    // these are the same class objects, which is how a live db connection survives a rollback
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
