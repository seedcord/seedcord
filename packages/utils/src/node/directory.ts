import { readdir, readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type * as fs from 'node:fs';

/**
 * Determines if a directory entry is a TypeScript or JavaScript file.
 */
export function isTsOrJsFile(entry: fs.Dirent): boolean {
    return (
        entry.isFile() &&
        (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) &&
        !entry.name.endsWith('.d.ts') &&
        !entry.name.endsWith('.map')
    );
}

type ModuleLoader = () => Promise<Record<string, unknown>>;
type TextLoader = () => Promise<string>;

interface BundledFiles {
    root: string;
    modules: Record<string, ModuleLoader>;
    text: Record<string, TextLoader>;
}

interface BundledTable {
    root: string;
    modules: Map<string, ModuleLoader>;
    text: Map<string, TextLoader>;
}

// Symbol.for so every copy of @seedcord/utils in a process reads one table
const BUNDLED_TABLE = Symbol.for('seedcord.bundledModules');

// seedcord build calls this from the entry it generates
export function registerBundledModules({ root, modules, text }: BundledFiles): void {
    const resolvedRoot = path.resolve(root);
    const table: BundledTable = {
        root: resolvedRoot,
        modules: new Map(
            Object.entries(modules).map(([key, load]) => [path.join(resolvedRoot, key.replace(/\.ts$/, '.js')), load])
        ),
        text: new Map(Object.entries(text).map(([key, load]) => [path.join(resolvedRoot, key), load]))
    };
    Reflect.set(globalThis, BUNDLED_TABLE, table);
}

function bundledTable(): BundledTable | undefined {
    return Reflect.get(globalThis, BUNDLED_TABLE) as BundledTable | undefined;
}

function isInside(dir: string, root: string): boolean {
    const relative = path.relative(root, dir);
    return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function entriesUnder<Loader>(root: string, entries: Map<string, Loader>, dir: string): [string, Loader][] {
    const resolved = path.resolve(dir);
    if (!isInside(resolved, root)) {
        throw new SeedcordError(SeedcordErrorCode.CoreDirectoryOutsideRoot, [resolved, root]);
    }

    const prefix = resolved + path.sep;
    return [...entries].filter(([fullPath]) => fullPath.startsWith(prefix)).sort(([a], [b]) => (a < b ? -1 : 1));
}

function fromCwd(fullPath: string): string {
    return path.relative(process.cwd(), fullPath);
}

async function loadModule(relativePath: string, load: ModuleLoader): Promise<Record<string, unknown>> {
    try {
        return await load();
    } catch (err) {
        throw new SeedcordError(SeedcordErrorCode.CoreDirectoryImportFailed, [relativePath], { cause: err });
    }
}

/**
 * Recursively traverses through a directory, importing all .ts and .js files and applying a callback to each import.
 *
 * @throws A **SeedcordError** when a directory cannot be read or a file throws while importing.
 *
 * @example
 * ```ts
 * await traverseDirectory('./commands', (fullPath, relativePath, imported) => {
 *     for (const exported of Object.values(imported)) register(exported);
 * });
 * ```
 */
export async function traverseDirectory(
    dir: string,
    callback: (fullPath: string, relativePath: string, imported: Record<string, unknown>) => Promise<void> | void
): Promise<void> {
    const table = bundledTable();
    if (table) {
        for (const [fullPath, load] of entriesUnder(table.root, table.modules, dir)) {
            const relativePath = fromCwd(fullPath);
            await callback(fullPath, relativePath, await loadModule(relativePath, load));
        }
        return;
    }

    let entries: fs.Dirent[];

    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
        throw new SeedcordError(SeedcordErrorCode.CoreDirectoryUnreadable, [dir], { cause: err });
    }

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = fromCwd(fullPath);

        if (entry.isDirectory()) {
            await traverseDirectory(fullPath, callback);
        } else if (isTsOrJsFile(entry)) {
            // node reads a raw windows path's drive letter as a url protocol
            const load: ModuleLoader = () => import(pathToFileURL(fullPath).href) as Promise<Record<string, unknown>>;
            await callback(fullPath, relativePath, await loadModule(relativePath, load));
        }
    }
}

/**
 * Recursively reads every file under a directory that is not a .ts or .js file, passing its text to the callback.
 * In a built bot the files come from the table `seedcord build` registers.
 *
 * @throws A **SeedcordError** when the directory or a file in it cannot be read.
 *
 * @example
 * ```ts
 * await readTextFiles('./locales', (fullPath, relativePath, text) => {
 *     locales.set(path.basename(fullPath, '.json'), JSON.parse(text));
 * });
 * ```
 */
export async function readTextFiles(
    dir: string,
    callback: (fullPath: string, relativePath: string, text: string) => Promise<void> | void
): Promise<void> {
    const table = bundledTable();
    if (table) {
        for (const [fullPath, load] of entriesUnder(table.root, table.text, dir)) {
            await callback(fullPath, fromCwd(fullPath), await load());
        }
        return;
    }

    let entries: fs.Dirent[];

    try {
        entries = await readdir(dir, { withFileTypes: true, recursive: true });
    } catch (err) {
        throw new SeedcordError(SeedcordErrorCode.CoreDirectoryUnreadable, [dir], { cause: err });
    }

    const files = entries
        .filter((entry) => entry.isFile() && !isTsOrJsFile(entry))
        .map((entry) => path.join(entry.parentPath, entry.name))
        .sort();

    for (const fullPath of files) {
        let text: string;
        try {
            text = await readFile(fullPath, 'utf8');
        } catch (err) {
            throw new SeedcordError(SeedcordErrorCode.CoreDirectoryUnreadable, [fullPath], { cause: err });
        }
        await callback(fullPath, fromCwd(fullPath), text);
    }
}
