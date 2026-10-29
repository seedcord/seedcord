import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { BotLayout } from './BotLayout';
import { decodeFile } from './encodedFile';
import { botFilesSlot } from './slots';

import type { BotFolder } from './BotLayout';
import type { BotFilesSlot, BuiltSlot, ModuleLoader } from './slots';
import type { Buffer } from 'node:buffer';

type BytesLoader = () => Promise<Buffer>;
type Loaders<Loader> = [fullPath: string, load: Loader][];

interface FolderAccess {
    resolve(dir: string): string;
    resolveBundled(dir: string): string;
    resolveListed(dir: string): string;
    layoutAt(folder: string): BotLayout;
}

class BotFolderAccess implements FolderAccess {
    public constructor(private readonly layout: BotLayout) {}

    public resolve(dir: string): string {
        return this.layout.resolve(dir);
    }

    public resolveBundled(dir: string): string {
        const folder = this.resolve(dir);
        this.layout.assertBundled(folder);
        return folder;
    }

    public resolveListed(dir: string): string {
        const folder = this.resolve(dir);
        const problem = this.layout.listedReadProblem(folder);
        if (problem) throw problem;
        return folder;
    }

    public layoutAt(): BotLayout {
        return this.layout;
    }
}

// a plain script or test has no config
class OpenFolderAccess implements FolderAccess {
    public resolve(dir: string): string {
        if (!path.isAbsolute(dir)) throw new SeedcordError(SeedcordErrorCode.CoreDirectoryRootUnknown, [dir]);
        return path.resolve(dir);
    }

    public resolveBundled(dir: string): string {
        return this.resolve(dir);
    }

    public resolveListed(dir: string): string {
        return this.resolve(dir);
    }

    public layoutAt(folder: string): BotLayout {
        return BotLayout.openAt(folder);
    }
}

abstract class FileSource {
    public constructor(private readonly access: FolderAccess) {}

    public layoutFor(dir: string): BotLayout {
        return this.access.layoutAt(this.access.resolve(dir));
    }

    public modules(dir: string): Promise<Loaders<ModuleLoader>> {
        const folder = this.access.resolveBundled(dir);
        return this.modulesIn(folder, this.access.layoutAt(folder));
    }

    public files(dir: string): Promise<Loaders<BytesLoader>> {
        const folder = this.access.resolveListed(dir);
        return this.filesIn(folder, this.access.layoutAt(folder));
    }

    protected abstract modulesIn(folder: string, layout: BotLayout): Promise<Loaders<ModuleLoader>>;
    protected abstract filesIn(folder: string, layout: BotLayout): Promise<Loaders<BytesLoader>>;
}

class DiskFiles extends FileSource {
    protected async modulesIn(folder: string, layout: BotLayout): Promise<Loaders<ModuleLoader>> {
        const files = await layout.modulesUnder(folder);
        // node reads a raw windows path's drive letter as a url protocol
        return files.map((file) => [
            file,
            () => import(/* @vite-ignore */ pathToFileURL(file).href) as Promise<Record<string, unknown>>
        ]);
    }

    protected async filesIn(folder: string, layout: BotLayout): Promise<Loaders<BytesLoader>> {
        const all = await DiskFiles.filesUnder(folder, layout);
        const files = all.filter((file) => layout.isListedFile(file));
        return files.map((file) => [file, () => readFile(file)]);
    }

    private static async filesUnder(folder: string, layout: BotLayout): Promise<string[]> {
        const entries = await Array.fromAsync(layout.entriesUnder(folder));
        return entries
            .filter(({ isFolder }) => !isFolder)
            .map(({ path: file }) => file)
            .toSorted();
    }
}

class BuiltFiles extends FileSource {
    private readonly root: string;
    private readonly folders: Set<string>;
    private readonly moduleLoaders: Map<string, ModuleLoader>;
    private readonly fileLoaders: Map<string, BytesLoader>;

    public constructor(slot: BuiltSlot) {
        const layout = new BotLayout(slot);
        super(new BotFolderAccess(layout));
        const { folders, modules, listedFiles, sourcePaths = false } = slot;
        this.root = layout.root;
        this.folders = new Set([this.root, ...folders.map((folder) => path.join(this.root, folder))]);
        const pathOf = (key: string): string => (sourcePaths ? key : BotLayout.builtPath(key));
        this.moduleLoaders = new Map(
            Object.entries(modules)
                .filter(([key]) => layout.isModule(path.join(this.root, key)))
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
        return Promise.resolve(this.under(this.fileLoaders, folder));
    }

    private under<Loader>(loaders: Map<string, Loader>, folder: string): Loaders<Loader> {
        if (!this.folders.has(folder)) {
            throw new SeedcordError(SeedcordErrorCode.CoreDirectoryNotBuilt, [folder, this.root]);
        }

        const prefix = path.join(folder, path.sep);
        return [...loaders].filter(([file]) => file.startsWith(prefix)).sort(([a], [b]) => (a < b ? -1 : 1));
    }
}

// every reader of one slot shares its BotLayout
const sources = new WeakMap<BotFilesSlot, FileSource>();

function sourceOf(slot: BotFilesSlot): FileSource {
    const source =
        sources.get(slot) ??
        (slot.kind === 'built' ? new BuiltFiles(slot) : new DiskFiles(new BotFolderAccess(new BotLayout(slot))));
    sources.set(slot, source);
    return source;
}

export function fileSource(): FileSource {
    const slot = botFilesSlot();
    return slot ? sourceOf(slot) : new DiskFiles(new OpenFolderAccess());
}

export function botFolder(dir: string): BotFolder {
    return fileSource().layoutFor(dir).folderAt(dir);
}
