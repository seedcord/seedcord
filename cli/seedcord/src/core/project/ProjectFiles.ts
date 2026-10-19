import { basename, dirname, relative } from 'node:path';

import { logsFolderIn } from '@seedcord/logger/internal';
import { BotLayout } from '@seedcord/utils/internal';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { BotEntry } from '@seedcord/utils/internal';

type ProjectPaths = Pick<ResolvedSeedcordConfig, 'root' | 'configFile' | 'files' | 'target'>;

function layoutOf({ root, configFile, files, target }: ProjectPaths): BotLayout {
    const configDir = dirname(configFile);
    const keysOf = (paths: string[]): string[] => paths.map((path) => BotLayout.keyUnder(root, path));
    const outDir = target.kind === 'server' ? [target.outDir] : [];

    return new BotLayout({
        root,
        listed: keysOf(files),
        skippedFolders: keysOf([...outDir, logsFolderIn(configDir)]),
        configDir: BotLayout.keyUnder(root, configDir)
    });
}

const filesOfConfig = new WeakMap<ProjectPaths, ProjectFiles>();

export class ProjectFiles {
    public readonly layout: BotLayout;

    private constructor(paths: ProjectPaths) {
        this.layout = layoutOf(paths);
    }

    // dev, build and codegen share one layout per config
    public static of(paths: ProjectPaths): ProjectFiles {
        const files = filesOfConfig.get(paths) ?? new ProjectFiles(paths);
        filesOfConfig.set(paths, files);
        return files;
    }

    // sorted by path, the order importFiles loads them in
    public async modulePaths(folder = this.layout.root): Promise<string[]> {
        this.layout.assertBundled(folder);
        const entries = await Array.fromAsync(this.layout.entriesUnder(folder));
        return entries
            .filter(({ path }) => this.layout.isModule(path))
            .map(({ path }) => path)
            .toSorted();
    }

    public async foldersIncludingEmpty(): Promise<string[]> {
        const entries = await this.entries();
        return entries
            .filter(({ isFolder }) => isFolder)
            .map(({ path }) => this.layout.keyOf(path))
            .toSorted();
    }

    public async pathsWithHash(): Promise<string[]> {
        const entries = await this.entries();
        return entries
            .map(({ path }) => path)
            .filter((path) => basename(path).includes('#') && !relative(this.layout.root, dirname(path)).includes('#'))
            .toSorted();
    }

    private entries(): Promise<BotEntry[]> {
        return Array.fromAsync(this.layout.entriesUnder(this.layout.root));
    }
}
