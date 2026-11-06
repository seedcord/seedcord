import { pathToFileURL } from 'node:url';

import { isSeedcordError, paint, SeedcordErrorCode } from '@seedcord/errors';
import { formatFilePath } from '@seedcord/utils';
import { botFolder, vitePluginThrew } from '@seedcord/utils/internal';

import type { Logger } from '@seedcord/logger';
import type { HmrUpdateEvent } from '@seedcord/types';

interface HmrFolderOptions<TUnit> {
    dir: string;
    is: (val: unknown) => val is TUnit;
    register: (unit: TUnit, file: string) => void;
}

interface HmrHandlerOptions<THandler, TArtifacts> extends HmrFolderOptions<THandler> {
    unregister: (handler: THandler, artifacts?: TArtifacts) => void;
    /** Called each time a handler is tracked. `unregister` receives the result as its second argument. */
    getArtifacts?: (handler: THandler) => TArtifacts;
}

interface HmrMiddlewareOptions<TMiddleware> extends HmrFolderOptions<TMiddleware> {
    unregister: (middleware: TMiddleware) => void;
}

interface HmrModuleHandlerOptions<THandler, TMiddleware = void, TArtifacts = unknown> {
    handlers: HmrHandlerOptions<THandler, TArtifacts>;
    middlewares?: HmrMiddlewareOptions<TMiddleware>;
    logger: Logger;
}

interface FileUnits<THandler, TMiddleware> {
    handlers: THandler[];
    middlewares: TMiddleware[];
}

const displayName = (unit: unknown, fallback: string): string => (typeof unit === 'function' ? unit.name : fallback);

function unitNames({ handlers, middlewares }: FileUnits<unknown, unknown>): string[] {
    return [
        ...handlers.map((handler) => displayName(handler, 'Handler')),
        ...middlewares.map((middleware) => displayName(middleware, 'Middleware'))
    ];
}

function hasUnits({ handlers, middlewares }: FileUnits<unknown, unknown>): boolean {
    return handlers.length > 0 || middlewares.length > 0;
}

function addToFile<TUnit>(fileToUnits: Map<string, Set<TUnit>>, file: string, unit: TUnit): void {
    const units = fileToUnits.get(file);
    if (units) units.add(unit);
    else fileToUnits.set(file, new Set([unit]));
}

/**
 * Reloads THandler and optional TMiddleware modules on HMR updates.
 *
 * Call `handle()` from your `HmrAware.onHmr()` for standard reload behavior, or write a fully custom `onHmr()` and skip this class.
 *
 * This is only useful during development.
 */
export class HmrModuleHandler<THandler, TMiddleware = void, TArtifacts = unknown> {
    readonly #options: HmrModuleHandlerOptions<THandler, TMiddleware, TArtifacts>;
    // no import.meta.hot.data stash needed because a leaf reload never reconstructs the singleton holding these Maps
    readonly #fileToHandlers = new Map<string, Set<THandler>>();
    readonly #fileToMiddlewares = new Map<string, Set<TMiddleware>>();
    readonly #handlerArtifacts = new Map<THandler, TArtifacts>();
    // a moved handler's new file can load before its old file unloads
    readonly #blockedFiles = new Set<string>();

    constructor(options: HmrModuleHandlerOptions<THandler, TMiddleware, TArtifacts>) {
        this.#options = { ...options, logger: options.logger.withChannel('hmr') };
    }

    /**
     * Unloads or reloads the modules affected by an {@link HmrUpdateEvent}, scoped to the handler and middleware directories.
     * When that unloads something, it also retries every file that failed earlier on a duplicate name.
     */
    public async handle(event: HmrUpdateEvent): Promise<void> {
        const { file, affectedModules, type } = event;

        // a directory is never importable. its files arrive as their own create events
        if (type === 'createDir') return;

        const affected = affectedModules?.length ? affectedModules : [file];
        const freesNames = affected.some((candidate) => this.#holdsUnits(candidate));
        const retried = freesNames ? [...this.#blockedFiles].filter((blocked) => blocked !== file) : [];

        if (type === 'delete' || type === 'deleteDir') {
            this.#report('Unloaded', unitNames(this.#unload(file)), [file]);
            await this.#reload(retried, event);
        } else {
            await this.#reload([...affected, ...retried], event);
        }
    }

    /** Links the handler to its source file so a later update can unload it. */
    public trackHandler(file: string, handler: THandler): void {
        addToFile(this.#fileToHandlers, file, handler);

        const { getArtifacts } = this.#options.handlers;
        if (getArtifacts) this.#handlerArtifacts.set(handler, getArtifacts(handler));
    }

    /** Links the middleware to its source file so a later update can unload it. */
    public trackMiddleware(file: string, middleware: TMiddleware): void {
        addToFile(this.#fileToMiddlewares, file, middleware);
    }

    #holdsUnits(file: string): boolean {
        return this.#fileToHandlers.has(file) || this.#fileToMiddlewares.has(file);
    }

    #inScope(file: string): boolean {
        const { handlers, middlewares } = this.#options;

        if (botFolder(handlers.dir).holdsModule(file)) return true;
        return middlewares ? botFolder(middlewares.dir).holdsModule(file) : false;
    }

    async #reload(candidates: Iterable<string>, { type, rollback = true }: HmrUpdateEvent): Promise<void> {
        const files = [...new Set(candidates)].filter((file) => this.#inScope(file));
        // every file unloads before any file loads, so no file in this save can block another
        const lastGood = new Map(files.map((file) => [file, this.#unload(file)]));

        const startedAt = Date.now();
        const names: string[] = [];
        const touched: string[] = [];

        for (const [file, units] of lastGood) {
            const loaded = await this.#load(file, units, rollback);
            if (loaded.length === 0) continue;

            names.push(...loaded);
            touched.push(file);
        }

        this.#report(type === 'create' ? 'Registered' : 'Reloaded', names, touched, Date.now() - startedAt);
    }

    // one line per save, since one edit can reload every module that imports the file
    #report(verb: string, names: string[], files: string[], elapsedMs?: number): void {
        if (names.length === 0) return;

        const [only, ...others] = files;
        const from = only && others.length === 0 ? formatFilePath(only) : `${String(files.length)} files`;
        const timing = elapsedMs === undefined ? '' : ` ${paint.mute('in')} ${String(elapsedMs)}ms`;
        this.#options.logger.debug(`${verb} ${paint.sky.bold(names.join(', '))} from ${paint.mute(from)}${timing}`);
    }

    // these are the same class objects, which is how a live db connection survives a rollback
    #unload(file: string): FileUnits<THandler, TMiddleware> {
        const handlers = [...(this.#fileToHandlers.get(file) ?? [])];
        const middlewares = [...(this.#fileToMiddlewares.get(file) ?? [])];

        for (const handler of handlers) {
            this.#options.handlers.unregister(handler, this.#handlerArtifacts.get(handler));
            this.#handlerArtifacts.delete(handler);
        }
        for (const middleware of middlewares) {
            this.#options.middlewares?.unregister(middleware);
        }

        this.#fileToHandlers.delete(file);
        this.#fileToMiddlewares.delete(file);
        this.#blockedFiles.delete(file);
        return { handlers, middlewares };
    }

    async #load(file: string, lastGood: FileUnits<THandler, TMiddleware>, rollback: boolean): Promise<string[]> {
        try {
            const units = await this.#importUnits(file);
            this.#register(file, units);
            if (hasUnits(lastGood) && !hasUnits(units)) this.#warnUnitsLost(file, lastGood);
            return unitNames(units);
        } catch (error) {
            const path = formatFilePath(file);
            this.#options.logger.error(`Failed to reload file: ${path}`, vitePluginThrew(error) ?? error);
            this.#abandon(file, error);
        }

        if (rollback && hasUnits(lastGood)) this.#rollBack(file, lastGood);
        return [];
    }

    #warnUnitsLost(file: string, lost: FileUnits<THandler, TMiddleware>): void {
        const names = paint.sky.bold(unitNames(lost).join(', '));
        const path = paint.mute(formatFilePath(file));
        this.#options.logger.warn(
            `${paint.amber.bold('Unloaded')} ${names} because reloading ${path} didn't find them. If the file still exports them, restart dev.`
        );
    }

    async #importUnits(file: string): Promise<FileUnits<THandler, TMiddleware>> {
        const { handlers, middlewares } = this.#options;

        let fileUrl = pathToFileURL(file).href;
        // vitest has no real vite server managing the module graph
        if (process.env.VITEST === 'true') fileUrl += `?update=${Date.now()}`;

        // justified: a dynamic import resolves to an untyped export map
        const imported = (await import(/* @vite-ignore */ fileUrl)) as Record<string, unknown>;

        const units: FileUnits<THandler, TMiddleware> = { handlers: [], middlewares: [] };
        for (const val of Object.values(imported)) {
            if (handlers.is(val)) units.handlers.push(val);
            else if (middlewares?.is(val)) units.middlewares.push(val);
        }
        return units;
    }

    #register(file: string, { handlers, middlewares }: FileUnits<THandler, TMiddleware>): void {
        for (const handler of handlers) {
            this.#options.handlers.register(handler, file);
            this.trackHandler(file, handler);
        }
        for (const middleware of middlewares) {
            this.#options.middlewares?.register(middleware, file);
            this.trackMiddleware(file, middleware);
        }
    }

    // a failed registration can leave part of the file registered
    #abandon(file: string, error: unknown): void {
        this.#unload(file);
        if (isSeedcordError(error, 'SeedcordTypeError', SeedcordErrorCode.CoreDuplicateName)) {
            this.#blockedFiles.add(file);
        }
    }

    // a typo keeps the last-good units live until the next good save
    #rollBack(file: string, lastGood: FileUnits<THandler, TMiddleware>): void {
        const { logger } = this.#options;
        const path = paint.mute(formatFilePath(file));

        try {
            this.#register(file, lastGood);
            logger.warn(`${paint.amber.bold('Rolled back')} ${path} to the last-good version`);
        } catch (error) {
            logger.error(`Failed to roll back ${path}`, error);
            this.#abandon(file, error);
        }
    }
}
