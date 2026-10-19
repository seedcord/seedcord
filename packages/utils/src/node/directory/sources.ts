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

function assertInsideRoot(root: string, folder: string): void {
    if (!isInside(root, folder)) throw new SeedcordError(SeedcordErrorCode.CorePathOutsideRoot, [folder, root]);
}

abstract class FileSource {
    // a plain script or test passes undefined
    public constructor(private readonly bot: BotFolders | undefined) {}

    public resolve(dir: string): string {
        if (path.isAbsolute(dir)) return path.resolve(dir);
        if (!this.bot) throw new SeedcordError(SeedcordErrorCode.CoreDirectoryRootUnknown, [dir]);
        return resolveFromRoot(this.bot.root, dir);
    }

    public modules(dir: string): Promise<Loaders<ModuleLoader>> {
        return this.modulesIn(this.resolve(dir));
    }

    public files(dir: string): Promise<Loaders<BytesLoader>> {
        const folder = this.resolve(dir);
        this.assertListed(folder);
        return this.filesIn(folder);
    }

    private assertListed(folder: string): void {
        if (!this.bot) return;

        const root = path.resolve(this.bot.root);
        assertInsideRoot(root, folder);
        if (!this.bot.listed.some((listed) => isInside(path.join(root, listed), folder))) {
            throw new SeedcordError(SeedcordErrorCode.CoreDirectoryNotListed, [folder]);
        }
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
        super(slot);
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
        assertInsideRoot(this.root, folder);
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
    return slot?.kind === 'built' ? builtFilesOf(slot) : new DiskFiles(slot);
}

export function resolveFolder(dir: string): string {
    return fileSource().resolve(dir);
}
