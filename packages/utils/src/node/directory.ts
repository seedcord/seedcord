import { readdir, readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { asError } from '#src/misc/asError';

import { importFailed } from './importFailed';
import { isInside, resolveFromRoot } from './paths';

import type * as fs from 'node:fs';

/**
 * Determines if a directory entry is a TypeScript or JavaScript file.
 */
export function isTsOrJsFile(entry: fs.Dirent): boolean {
    return entry.isFile() && isModulePath(entry.name);
}

const MODULE_EXTENSIONS = ['.ts', '.js'];
const DECLARATION_EXTENSION = '.d.ts';
const NOT_TEXT_EXTENSIONS = [...MODULE_EXTENSIONS, '.map'];

function isModulePath(file: string): boolean {
    const name = path.basename(file);
    return MODULE_EXTENSIONS.some((extension) => name.endsWith(extension)) && !name.endsWith(DECLARATION_EXTENSION);
}

function isHidden(dir: string, file: string): boolean {
    return path
        .relative(dir, file)
        .split(path.sep)
        .some((part) => part.startsWith('.'));
}

function isTextPath(dir: string, file: string): boolean {
    const name = path.basename(file);
    return !isHidden(dir, file) && !NOT_TEXT_EXTENSIONS.some((extension) => name.endsWith(extension));
}

export function moduleGlobs(base: string): string[] {
    return [
        ...MODULE_EXTENSIONS.map((extension) => `${base}/**/*${extension}`),
        `!${base}/**/*${DECLARATION_EXTENSION}`
    ];
}

export function textGlobs(base: string): string[] {
    return [`${base}/**/*`, ...NOT_TEXT_EXTENSIONS.map((extension) => `!${base}/**/*${extension}`)];
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
        const all = await DiskFiles.filesUnder(dir);
        const files = all.filter((file) => isModulePath(file) && !isHidden(dir, file));
        // node reads a raw windows path's drive letter as a url protocol
        return files.map((file) => [
            file,
            () => import(/* @vite-ignore */ pathToFileURL(file).href) as Promise<Record<string, unknown>>
        ]);
    }

    public async texts(dir: string): Promise<Loaders<TextLoader>> {
        const all = await DiskFiles.filesUnder(dir);
        const files = all.filter((file) => isTextPath(dir, file));
        return files.map((file) => [file, () => readFile(file, 'utf8')]);
    }

    private static async filesUnder(dir: string): Promise<string[]> {
        let entries: fs.Dirent[];
        try {
            entries = await readdir(dir, { withFileTypes: true, recursive: true });
        } catch (err) {
            throw new SeedcordError(SeedcordErrorCode.CorePathUnreadable, [dir, asError(err).message], {
                cause: err
            });
        }

        return entries
            .filter((entry) => entry.isFile())
            .map((entry) => path.join(entry.parentPath, entry.name))
            .sort();
    }
}

class BuiltFiles implements FileSource {
    private readonly root: string;
    private readonly folders: Set<string>;
    private readonly moduleLoaders: Map<string, ModuleLoader>;
    private readonly textLoaders: Map<string, TextLoader>;

    public constructor({ root, folders, modules, text, sourcePaths = false }: BuiltFileLoaders) {
        this.root = path.resolve(root);
        this.folders = new Set([this.root, ...folders.map((folder) => path.join(this.root, folder))]);
        const pathOf = sourcePaths ? (key: string): string => key : builtModulePath;
        this.moduleLoaders = new Map(
            Object.entries(modules)
                .filter(([key]) => isModulePath(key))
                .map(([key, load]) => [path.join(this.root, pathOf(key)), load])
        );
        this.textLoaders = new Map(Object.entries(text).map(([key, load]) => [path.join(this.root, key), load]));
    }

    public modules(dir: string): Promise<Loaders<ModuleLoader>> {
        return Promise.resolve(this.under(this.moduleLoaders, dir));
    }

    public texts(dir: string): Promise<Loaders<TextLoader>> {
        return Promise.resolve(this.under(this.textLoaders, dir).filter(([file]) => isTextPath(dir, file)));
    }

    private under<Loader>(loaders: Map<string, Loader>, dir: string): Loaders<Loader> {
        const resolved = path.resolve(dir);
        if (!isInside(this.root, resolved)) {
            throw new SeedcordError(SeedcordErrorCode.CorePathOutsideRoot, [resolved, this.root]);
        }
        if (!this.folders.has(resolved))
            throw new SeedcordError(SeedcordErrorCode.CoreDirectoryNotBuilt, [dir, this.root]);

        const prefix = path.join(resolved, path.sep);
        return [...loaders].filter(([file]) => file.startsWith(prefix)).sort(([a], [b]) => (a < b ? -1 : 1));
    }
}

interface BuiltFileLoaders {
    root: string;
    // every folder under root, empty ones included
    folders: string[];
    modules: Record<string, ModuleLoader>;
    text: Record<string, TextLoader>;
    // seedcord dev runs the source files themselves
    sourcePaths?: boolean;
}

// seedcord build writes a BuiltFileLoaders object here from the entry it generates
export const BUILT_FILES_KEY = 'seedcord:utils:built-files';

// a built bot reports each module by the path of the file it became
export function builtModulePath(key: string): string {
    return key.replace(/\.ts$/, '.js');
}

// a global because dev loads the bot with its own copy of this module
const ROOT_SLOT = Symbol.for('seedcord:utils:root');

const builtSources = new WeakMap<BuiltFileLoaders, BuiltFiles>();

function builtFiles(): BuiltFileLoaders | undefined {
    return Reflect.get(globalThis, Symbol.for(BUILT_FILES_KEY)) as BuiltFileLoaders | undefined;
}

export function setBotRoot(root: string | undefined): void {
    if (root === undefined) Reflect.deleteProperty(globalThis, ROOT_SLOT);
    else Reflect.set(globalThis, ROOT_SLOT, root);
}

function devRoot(): string | undefined {
    const root: unknown = Reflect.get(globalThis, ROOT_SLOT);
    return typeof root === 'string' ? root : undefined;
}

export function resolveFolder(dir: string): string {
    if (path.isAbsolute(dir)) return path.resolve(dir);

    const root = builtFiles()?.root ?? devRoot();
    if (!root) throw new SeedcordError(SeedcordErrorCode.CoreDirectoryRootUnknown, [dir]);
    return resolveFromRoot(root, dir);
}

function fileSource(): FileSource {
    const built = builtFiles();
    if (!built) return new DiskFiles();

    const source = builtSources.get(built) ?? new BuiltFiles(built);
    builtSources.set(built, source);
    return source;
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
 * It skips dotfiles and dot-folders. A `break` stops the walk before the next import.
 * A relative `dir` resolves against `root` from seedcord.config.ts, whichever file calls this.
 *
 * @throws A **SeedcordError** when the directory cannot be read or a file throws while importing, when `dir` is relative and the bot did not start through `seedcord dev` or its built output, or in a built bot when the directory is outside `root` or was missing when it was built.
 *
 * @example
 * ```ts
 * for await (const { relativePath, imported } of traverseDirectory('./commands')) {
 *     for (const exported of Object.values(imported)) register(exported, relativePath);
 * }
 * ```
 */
export async function* traverseDirectory(dir: string): AsyncGenerator<ImportedFile> {
    for (const [fullPath, load] of await fileSource().modules(resolveFolder(dir))) {
        const relativePath = path.relative(process.cwd(), fullPath);
        let imported: Record<string, unknown>;
        try {
            imported = await load();
        } catch (err) {
            throw importFailed(relativePath, err);
        }
        yield { fullPath, relativePath, imported };
    }
}

/**
 * Reads every file under a directory, recursively and sorted by path, yielding its text.
 * It skips every .ts, .js, or .map file. Dotfiles and dot-folders are skipped too.
 * In a built bot the files come from the build output. A relative `dir` resolves against `root`, the same as {@link traverseDirectory}.
 *
 * @throws A **SeedcordError** when the directory or a file in it cannot be read, when `dir` is relative and the bot did not start through `seedcord dev` or its built output, or in a built bot when the directory is outside `root` or was missing when it was built.
 *
 * @example
 * ```ts
 * for await (const { fullPath, text } of readTextFiles('./locales')) {
 *     locales.set(path.basename(fullPath, '.json'), JSON.parse(text));
 * }
 * ```
 */
export async function* readTextFiles(dir: string): AsyncGenerator<TextFile> {
    for (const [fullPath, load] of await fileSource().texts(resolveFolder(dir))) {
        const relativePath = path.relative(process.cwd(), fullPath);
        let text: string;
        try {
            text = await load();
        } catch (err) {
            throw new SeedcordError(SeedcordErrorCode.CorePathUnreadable, [relativePath, asError(err).message], {
                cause: err
            });
        }
        yield { fullPath, relativePath, text };
    }
}
