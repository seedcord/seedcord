import { readdir, readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { asError } from '#src/misc/asError';
import { isInside } from '#src/node/paths';

import { decodeFile } from './encodedFile';
import { builtModulePath, isHidden, isModulePath, isNonCodeFile } from './extensions';
import { builtFiles } from './slots';

import type { BuiltFileLoaders, ModuleLoader } from './slots';
import type { Buffer } from 'node:buffer';
import type * as fs from 'node:fs';

type BytesLoader = () => Promise<Buffer>;
type Loaders<Loader> = [fullPath: string, load: Loader][];

interface FileSource {
    modules(dir: string): Promise<Loaders<ModuleLoader>>;
    files(dir: string): Promise<Loaders<BytesLoader>>;
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

    public async files(dir: string): Promise<Loaders<BytesLoader>> {
        const all = await DiskFiles.filesUnder(dir);
        const files = all.filter((file) => isNonCodeFile(dir, file));
        return files.map((file) => [file, () => readFile(file)]);
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
    private readonly fileLoaders: Map<string, BytesLoader>;

    public constructor({ root, folders, modules, files, sourcePaths = false }: BuiltFileLoaders) {
        this.root = path.resolve(root);
        this.folders = new Set([this.root, ...folders.map((folder) => path.join(this.root, folder))]);
        const pathOf = sourcePaths ? (key: string): string => key : builtModulePath;
        this.moduleLoaders = new Map(
            Object.entries(modules)
                .filter(([key]) => isModulePath(key))
                .map(([key, load]) => [path.join(this.root, pathOf(key)), load])
        );
        this.fileLoaders = new Map(
            Object.entries(files).map(([key, load]) => [
                path.join(this.root, key),
                async () => decodeFile(await load())
            ])
        );
    }

    public modules(dir: string): Promise<Loaders<ModuleLoader>> {
        return Promise.resolve(this.under(this.moduleLoaders, dir));
    }

    public files(dir: string): Promise<Loaders<BytesLoader>> {
        return Promise.resolve(this.under(this.fileLoaders, dir).filter(([file]) => isNonCodeFile(dir, file)));
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

const builtSources = new WeakMap<BuiltFileLoaders, BuiltFiles>();

export function fileSource(): FileSource {
    const built = builtFiles();
    if (!built) return new DiskFiles();

    const source = builtSources.get(built) ?? new BuiltFiles(built);
    builtSources.set(built, source);
    return source;
}
