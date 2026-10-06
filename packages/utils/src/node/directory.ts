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
type Loaders<Loader> = [fullPath: string, load: Loader][];

interface FileSource {
    modules(dir: string): Promise<Loaders<ModuleLoader>>;
    texts(dir: string): Promise<Loaders<TextLoader>>;
}

class DiskFiles implements FileSource {
    public async modules(dir: string): Promise<Loaders<ModuleLoader>> {
        const files = await DiskFiles.filesUnder(dir, isTsOrJsFile);
        // node reads a raw windows path's drive letter as a url protocol
        return files.map((file) => [file, () => import(pathToFileURL(file).href) as Promise<Record<string, unknown>>]);
    }

    public async texts(dir: string): Promise<Loaders<TextLoader>> {
        const files = await DiskFiles.filesUnder(dir, (entry) => entry.isFile() && !isTsOrJsFile(entry));
        return files.map((file) => [file, () => readFile(file, 'utf8')]);
    }

    private static async filesUnder(dir: string, include: (entry: fs.Dirent) => boolean): Promise<string[]> {
        let entries: fs.Dirent[];
        try {
            entries = await readdir(dir, { withFileTypes: true, recursive: true });
        } catch (err) {
            throw new SeedcordError(SeedcordErrorCode.CoreDirectoryUnreadable, [dir], { cause: err });
        }

        return entries
            .filter(include)
            .map((entry) => path.join(entry.parentPath, entry.name))
            .sort();
    }
}

class BuiltFiles implements FileSource {
    private readonly root: string;
    private readonly moduleLoaders: Map<string, ModuleLoader>;
    private readonly textLoaders: Map<string, TextLoader>;

    public constructor({ root, modules, text }: BuiltFileLoaders) {
        this.root = path.resolve(root);
        this.moduleLoaders = new Map(
            Object.entries(modules).map(([key, load]) => [path.join(this.root, key.replace(/\.ts$/, '.js')), load])
        );
        this.textLoaders = new Map(Object.entries(text).map(([key, load]) => [path.join(this.root, key), load]));
    }

    public modules(dir: string): Promise<Loaders<ModuleLoader>> {
        return Promise.resolve(this.under(this.moduleLoaders, dir));
    }

    public texts(dir: string): Promise<Loaders<TextLoader>> {
        return Promise.resolve(this.under(this.textLoaders, dir));
    }

    private under<Loader>(loaders: Map<string, Loader>, dir: string): Loaders<Loader> {
        const resolved = path.resolve(dir);
        if (!this.holds(resolved)) {
            throw new SeedcordError(SeedcordErrorCode.CoreDirectoryOutsideRoot, [resolved, this.root]);
        }

        const prefix = resolved + path.sep;
        return [...loaders].filter(([file]) => file.startsWith(prefix)).sort(([a], [b]) => (a < b ? -1 : 1));
    }

    private holds(dir: string): boolean {
        const relative = path.relative(this.root, dir);
        return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
    }
}

interface BuiltFileLoaders {
    root: string;
    modules: Record<string, ModuleLoader>;
    text: Record<string, TextLoader>;
}

// Symbol.for so every copy of @seedcord/utils in a process reads the same files
const BUILT_FILES = Symbol.for('seedcord:utils:built-files');

// seedcord build calls this from the entry it generates
export function registerBuiltFiles(loaders: BuiltFileLoaders): void {
    Reflect.set(globalThis, BUILT_FILES, new BuiltFiles(loaders));
}

function fileSource(): FileSource {
    return (Reflect.get(globalThis, BUILT_FILES) as FileSource | undefined) ?? new DiskFiles();
}

interface ImportedFile {
    fullPath: string;
    relativePath: string;
    imported: Record<string, unknown>;
}

interface TextFile {
    fullPath: string;
    relativePath: string;
    text: string;
}

/**
 * Imports every .ts and .js file under a directory, recursively and sorted by path, yielding each module in turn.
 * A `break` stops the walk before the next import.
 *
 * @throws A **SeedcordError** when the directory cannot be read or a file throws while importing.
 *
 * @example
 * ```ts
 * for await (const { relativePath, imported } of traverseDirectory('./commands')) {
 *     for (const exported of Object.values(imported)) register(exported, relativePath);
 * }
 * ```
 */
export async function* traverseDirectory(dir: string): AsyncGenerator<ImportedFile> {
    for (const [fullPath, load] of await fileSource().modules(dir)) {
        const relativePath = path.relative(process.cwd(), fullPath);
        let imported: Record<string, unknown>;
        try {
            imported = await load();
        } catch (err) {
            throw new SeedcordError(SeedcordErrorCode.CoreDirectoryImportFailed, [relativePath], { cause: err });
        }
        yield { fullPath, relativePath, imported };
    }
}

/**
 * Reads every file under a directory that is not a .ts or .js file, recursively and sorted by path, yielding its text.
 * A built bot reads them from the build output, where `node:fs` would not find them.
 *
 * @throws A **SeedcordError** when the directory or a file in it cannot be read.
 *
 * @example
 * ```ts
 * for await (const { fullPath, text } of readTextFiles('./locales')) {
 *     locales.set(path.basename(fullPath, '.json'), JSON.parse(text));
 * }
 * ```
 */
export async function* readTextFiles(dir: string): AsyncGenerator<TextFile> {
    for (const [fullPath, load] of await fileSource().texts(dir)) {
        let text: string;
        try {
            text = await load();
        } catch (err) {
            throw new SeedcordError(SeedcordErrorCode.CoreDirectoryUnreadable, [fullPath], { cause: err });
        }
        yield { fullPath, relativePath: path.relative(process.cwd(), fullPath), text };
    }
}
