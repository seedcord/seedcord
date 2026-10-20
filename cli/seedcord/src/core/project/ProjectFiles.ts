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
        configFile: BotLayout.keyUnder(root, configFile)
    });
}

export class ProjectFiles {
    public readonly layout: BotLayout;

    constructor(paths: ProjectPaths) {
        this.layout = layoutOf(paths);
    }

    public async modulePaths(folder = this.layout.root): Promise<string[]> {
        this.layout.assertBundled(folder);
        return this.layout.modulesUnder(folder);
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
