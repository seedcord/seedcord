import { readdir, readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { asError } from '#src/misc/asError';
import { isInside, resolveFromRoot } from '#src/node/paths';

import { decodeFile } from './encodedFile';
import { builtModulePath, isHidden, isModulePath, isNonCodeFile } from './extensions';
import { botFilesSlot } from './slots';

import type { BotFolders, BuiltSlot, ModuleLoader } from './slots';
import type { Buffer } from 'node:buffer';
import type * as fs from 'node:fs';

type BytesLoader = () => Promise<Buffer>;
type Loaders<Loader> = [fullPath: string, load: Loader][];

interface FolderAccess {
    resolve(dir: string): string;
    // resolve, then throw for a folder outside root
    walkable(dir: string): string;
    // resolve, then throw for a folder outside root or outside every folder in files
    readable(dir: string): string;
}

class BotFolderAccess implements FolderAccess {
    private readonly root: string;
    private readonly listed: string[];

    public constructor({ root, listed }: BotFolders) {
        this.root = path.resolve(root);
        this.listed = listed.map((folder) => path.join(this.root, folder));
    }

    public resolve(dir: string): string {
        return resolveFromRoot(this.root, dir);
    }

    public walkable(dir: string): string {
        const folder = this.resolve(dir);
        this.assertInsideRoot(folder);
        return folder;
    }

    public readable(dir: string): string {
        const folder = this.resolve(dir);
        this.assertInsideRoot(folder, 'readFiles');
        if (!this.listed.some((listed) => isInside(listed, folder))) {
            throw new SeedcordError(SeedcordErrorCode.CoreDirectoryNotListed, [folder]);
        }
        return folder;
    }

    private assertInsideRoot(folder: string, readBy?: 'readFiles'): void {
        if (isInside(this.root, folder)) return;
        throw new SeedcordError(SeedcordErrorCode.CorePathOutsideRoot, [folder, this.root, readBy]);
    }
}

// a plain script or test has no config
class OpenFolderAccess implements FolderAccess {
    public resolve(dir: string): string {
        if (!path.isAbsolute(dir)) throw new SeedcordError(SeedcordErrorCode.CoreDirectoryRootUnknown, [dir]);
        return path.resolve(dir);
    }

    public walkable(dir: string): string {
        return this.resolve(dir);
    }

    public readable(dir: string): string {
        return this.resolve(dir);
    }
}

abstract class FileSource {
    public constructor(private readonly access: FolderAccess) {}

    public resolve(dir: string): string {
        return this.access.resolve(dir);
    }

    public modules(dir: string): Promise<Loaders<ModuleLoader>> {
        return this.modulesIn(this.access.walkable(dir));
    }

    public files(dir: string): Promise<Loaders<BytesLoader>> {
        return this.filesIn(this.access.readable(dir));
    }

    protected abstract modulesIn(folder: string): Promise<Loaders<ModuleLoader>>;
    protected abstract filesIn(folder: string): Promise<Loaders<BytesLoader>>;
}

class DiskFiles extends FileSource {
    protected async modulesIn(folder: string): Promise<Loaders<ModuleLoader>> {
        const all = await DiskFiles.filesUnder(folder);
        const files = all.filter((file) => isModulePath(file) && !isHidden(folder, file));
        // node reads a raw windows path's drive letter as a url protocol
        return files.map((file) => [
            file,
            () => import(/* @vite-ignore */ pathToFileURL(file).href) as Promise<Record<string, unknown>>
        ]);
    }

    protected async filesIn(folder: string): Promise<Loaders<BytesLoader>> {
        const all = await DiskFiles.filesUnder(folder);
        const files = all.filter((file) => isNonCodeFile(folder, file));
        return files.map((file) => [file, () => readFile(file)]);
    }

    private static async filesUnder(folder: string): Promise<string[]> {
        let entries: fs.Dirent[];
        try {
            entries = await readdir(folder, { withFileTypes: true, recursive: true });
        } catch (err) {
            throw new SeedcordError(SeedcordErrorCode.CorePathUnreadable, [folder, asError(err).message], {
                cause: err
            });
        }

        return entries
            .filter((entry) => entry.isFile())
            .map((entry) => path.join(entry.parentPath, entry.name))
            .sort();
    }
}

class BuiltFiles extends FileSource {
    private readonly root: string;
    private readonly folders: Set<string>;
    private readonly moduleLoaders: Map<string, ModuleLoader>;
    private readonly fileLoaders: Map<string, BytesLoader>;

    public constructor(slot: BuiltSlot) {
        super(new BotFolderAccess(slot));
        const { root, folders, modules, listedFiles, sourcePaths = false } = slot;
        this.root = path.resolve(root);
        this.folders = new Set([this.root, ...folders.map((folder) => path.join(this.root, folder))]);
        const pathOf = sourcePaths ? (key: string): string => key : builtModulePath;
        this.moduleLoaders = new Map(
            Object.entries(modules)
                .filter(([key]) => isModulePath(key))
                .map(([key, load]) => [path.join(this.root, pathOf(key)), load])
        );
        this.fileLoaders = new Map(
            Object.entries(listedFiles).map(([key, load]) => [
                path.join(this.root, key),
                async () => decodeFile(await load())
            ])
        );
    }

    protected modulesIn(folder: string): Promise<Loaders<ModuleLoader>> {
        return Promise.resolve(this.under(this.moduleLoaders, folder));
    }

    protected filesIn(folder: string): Promise<Loaders<BytesLoader>> {
        return Promise.resolve(this.under(this.fileLoaders, folder).filter(([file]) => isNonCodeFile(folder, file)));
    }

    private under<Loader>(loaders: Map<string, Loader>, folder: string): Loaders<Loader> {
        if (!this.folders.has(folder)) {
            throw new SeedcordError(SeedcordErrorCode.CoreDirectoryNotBuilt, [folder, this.root]);
        }

        const prefix = path.join(folder, path.sep);
        return [...loaders].filter(([file]) => file.startsWith(prefix)).sort(([a], [b]) => (a < b ? -1 : 1));
    }
}

const builtSources = new WeakMap<BuiltSlot, BuiltFiles>();

function builtFilesOf(slot: BuiltSlot): BuiltFiles {
    const source = builtSources.get(slot) ?? new BuiltFiles(slot);
    builtSources.set(slot, source);
    return source;
}

export function fileSource(): FileSource {
    const slot = botFilesSlot();
    if (slot?.kind === 'built') return builtFilesOf(slot);
    return new DiskFiles(slot ? new BotFolderAccess(slot) : new OpenFolderAccess());
}

export function resolveFolder(dir: string): string {
    return fileSource().resolve(dir);
}
