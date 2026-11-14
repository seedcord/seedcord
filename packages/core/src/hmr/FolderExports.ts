import { paint } from '@seedcord/errors';
import { displayPath } from '@seedcord/errors/internal';
import { formatFilePath, importFiles } from '@seedcord/utils';
import { botFolder, fileUrl, vitePluginThrew } from '@seedcord/utils/internal';

import type { Logger } from '@seedcord/logger';
import type { HmrUpdateEvent } from '@seedcord/types';

interface FolderExportsOptions<TUnit> {
    dir: string;
    /** Folders inside `dir` to skip, like a middlewares folder that a second `FolderExports` loads. */
    exclude?: readonly string[];
    /** Receives every value that a file exports. The ones that it accepts are the folder's "units". */
    is: (value: unknown) => value is TUnit;
    register: (unit: TUnit, file: string) => void;
    unregister: (unit: TUnit) => void;
    logger: Logger;
}

const displayName = (unit: unknown): string => (typeof unit === 'function' ? unit.name : 'export');

let testImports = 0;

/**
 * Registers the values that the files in one folder export, and keeps them registered while you
 * edit those files under `seedcord dev`. `is` picks which exports count.
 *
 * A value that two files export, like a class and the barrel that re-exports it, registers once and
 * unregisters once neither file exports it.
 *
 * Call `load()` from your plugin's `init()` and `handle()` from its `onHmr()`.
 *
 * @example
 * ```ts
 * this.jobs = new FolderExports({
 *     dir,
 *     is: isJob,
 *     register: (job) => this.registry.set(job.name, job),
 *     unregister: (job) => this.registry.delete(job.name),
 *     logger: this.logger
 * });
 * ```
 */
export class FolderExports<TUnit> {
    readonly #options: FolderExportsOptions<TUnit>;
    readonly #hmrLogger: Logger;
    // no import.meta.hot.data stash needed because a leaf reload never reconstructs the singleton holding these
    readonly #fileToUnits = new Map<string, Set<TUnit>>();
    // a moved unit's new file can load before its old file unloads
    readonly #blockedFiles = new Set<string>();

    constructor(options: FolderExportsOptions<TUnit>) {
        this.#options = options;
        this.#hmrLogger = options.logger.withChannel('hmr');
    }

    /**
     * Imports every file in the folder and registers each unit once.
     *
     * @throws A **SeedcordError** when a file throws while it imports.
     * @throws Whatever `register` throws.
     */
    public async load(): Promise<void> {
        // a plugin that disconnects and inits again registers the whole folder again
        this.#fileToUnits.clear();
        this.#blockedFiles.clear();
        this.#options.logger.debug(paint.mute(this.#options.dir));
        for await (const { fullPath, imported } of importFiles(this.#options.dir)) {
            if (this.#holds(fullPath)) this.#register(fullPath, this.#unitsIn(imported));
        }
    }

    /**
     * Unloads or reloads the files in this folder that an {@link HmrUpdateEvent} affects. When that
     * unloads something, it also retries every file whose `register` threw earlier.
     */
    public async handle(event: HmrUpdateEvent): Promise<void> {
        const { file, affectedModules, type } = event;

        // a directory is never importable. its files arrive as their own create events
        if (type === 'createDir') return;

        const affected = affectedModules?.length ? affectedModules : [file];
        const freesNames = affected.some((candidate) => this.#fileToUnits.has(candidate));
        const retried = freesNames ? [...this.#blockedFiles].filter((blocked) => blocked !== file) : [];

        if (type === 'delete' || type === 'deleteDir') {
            const deleted = new Set(this.#fileToUnits.get(file));
            this.#report('Unloaded', this.#unload(file).released.map(displayName), [file]);
            const importers = affected.filter((candidate) => candidate !== file);
            await this.#reload([...importers, ...retried], event, deleted);
        } else {
            await this.#reload([...affected, ...retried], event);
        }
    }

    #holds(file: string): boolean {
        const { dir, exclude = [] } = this.#options;
        return botFolder(dir).holdsModule(file) && !exclude.some((skipped) => botFolder(skipped).holds(file));
    }

    #isTracked(unit: TUnit): boolean {
        return [...this.#fileToUnits.values()].some((units) => units.has(unit));
    }

    #unitsIn(imported: Record<string, unknown>): TUnit[] {
        return Object.values(imported).filter(this.#options.is);
    }

    async #reload(
        candidates: Iterable<string>,
        { type, rollback = true }: HmrUpdateEvent,
        deleted: ReadonlySet<TUnit> = new Set()
    ): Promise<void> {
        const files = [...new Set(candidates)].filter((file) => this.#holds(file));
        // unload everything first. if a class moved to another file in this save, loading it while the old file still has it registered throws a duplicate
        const lastGood = new Map(
            files.map((file) => [
                file,
                // what we roll back to if the new version throws. we skip the deleted file's stuff, since the barrel can't import it anymore anyway
                this.#unload(file).held.filter((unit) => !deleted.has(unit))
            ])
        );

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
        this.#hmrLogger.debug(`${verb} ${paint.sky.bold(names.join(', '))} from ${paint.mute(from)}${timing}`);
    }

    #unload(file: string): { held: TUnit[]; released: TUnit[] } {
        const held = [...(this.#fileToUnits.get(file) ?? [])];
        this.#fileToUnits.delete(file);
        this.#blockedFiles.delete(file);

        const released = held.filter((unit) => !this.#isTracked(unit));
        for (const unit of released) this.#options.unregister(unit);
        return { held, released };
    }

    async #load(file: string, lastGood: TUnit[], rollback: boolean): Promise<string[]> {
        try {
            const units = this.#unitsIn(await this.#import(file));
            const registered = this.#register(file, units);
            const lost = lastGood.filter((unit) => !this.#isTracked(unit));
            if (lost.length > 0 && units.length === 0) this.#warnUnitsLost(file, lost);
            return registered.map(displayName);
        } catch (error) {
            const path = formatFilePath(file);
            this.#hmrLogger.error(`Failed to reload file: ${path}`, vitePluginThrew(error) ?? error);
        }

        if (rollback && lastGood.length > 0) this.#rollBack(file, lastGood);
        return [];
    }

    #warnUnitsLost(file: string, lost: TUnit[]): void {
        const names = paint.sky.bold(lost.map(displayName).join(', '));
        const path = paint.mute(formatFilePath(file));
        this.#hmrLogger.warn(
            `${paint.amber.bold('Unloaded')} ${names} because reloading ${path} didn't find them. If the file still exports them, restart dev.`
        );
    }

    async #import(file: string): Promise<Record<string, unknown>> {
        let url = fileUrl(file);
        // vitest runs without a real vite server managing the module graph
        if (process.env.VITEST === 'true') url += `?update=${String(++testImports)}`;

        // justified: a dynamic import resolves to an untyped export map
        return (await import(/* @vite-ignore */ url)) as Record<string, unknown>;
    }

    // returns what it called register for, which excludes units another file already holds
    #register(file: string, units: TUnit[]): TUnit[] {
        const registered: TUnit[] = [];
        try {
            for (const unit of units) {
                if (!this.#isTracked(unit)) {
                    this.#options.register(unit, file);
                    this.#options.logger.utils.registration(displayName(unit), displayPath(file), undefined, 'trace');
                    registered.push(unit);
                }
                const tracked = this.#fileToUnits.get(file) ?? new Set();
                this.#fileToUnits.set(file, tracked.add(unit));
            }
            return registered;
        } catch (error) {
            // a failed register can leave part of the file registered, and the name it wanted may free up on a later save
            this.#unload(file);
            this.#blockedFiles.add(file);
            throw error;
        }
    }

    // the old classes go back because a typo shouldn't knock a handler out until the next good save
    // a db connection that a plugin opened for one is still open because they're the same objects
    #rollBack(file: string, lastGood: TUnit[]): void {
        const path = paint.mute(formatFilePath(file));

        try {
            this.#register(file, lastGood);
            this.#hmrLogger.warn(`${paint.amber.bold('Rolled back')} ${path} to the last-good version`);
        } catch (error) {
            this.#hmrLogger.error(`Failed to roll back ${path}`, error);
        }
    }
}
