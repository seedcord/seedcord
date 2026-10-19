import { readdirSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';

import { logsFolderIn } from '@seedcord/logger/internal';
import { BotLayout, isInside } from '@seedcord/utils/internal';
import { minimatch } from 'minimatch';

import { watchedPath } from './watchedPath';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { BotEntry } from '@seedcord/utils/internal';

const PROJECT_FILES = [
    'seedcord.config.*',
    'tsconfig*.json',
    'package.json',
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'bun.lock',
    'bun.lockb'
];

type ProjectPaths = Pick<ResolvedSeedcordConfig, 'root' | 'configFile' | 'files' | 'target'>;

function isProjectFileIn(configDir: string, file: string): boolean {
    return dirname(file) === configDir && PROJECT_FILES.some((pattern) => minimatch(basename(file), pattern));
}

function projectFilesIn(configDir: string): string[] {
    return readdirSync(configDir)
        .map((name) => join(configDir, name))
        .filter((file) => isProjectFileIn(configDir, file));
}

function layoutOf({ root, configFile, files, target }: ProjectPaths): BotLayout {
    const configDir = dirname(configFile);
    const keysOf = (paths: string[]): string[] => paths.map((path) => BotLayout.keyUnder(root, path));
    const outDir = target.kind === 'server' ? [target.outDir] : [];

    return new BotLayout({
        root,
        listed: keysOf(files),
        skippedFolders: keysOf([...outDir, logsFolderIn(configDir)]),
        projectFiles: keysOf(projectFilesIn(configDir))
    });
}

const filesOfConfig = new WeakMap<ProjectPaths, ProjectFiles>();

export class ProjectFiles {
    public readonly layout: BotLayout;
    private readonly configDir: string;
    private realFolders?: (readonly [real: string, folder: string])[];

    private constructor(paths: ProjectPaths) {
        this.layout = layoutOf(paths);
        this.configDir = dirname(paths.configFile);
    }

    // maps a path chokidar or vite reported back onto the layout's own spelling of root and the config folder
    public layoutPath(watched: string): string {
        this.realFolders ??= [this.layout.root, this.configDir].map((folder) => [watchedPath(folder), folder] as const);
        const match = this.realFolders.find(([real]) => isInside(real, watched));
        return match ? join(match[1], relative(match[0], watched)) : watched;
    }

    // matches one created after dev started too
    public isProjectFile(watched: string): boolean {
        return isProjectFileIn(this.configDir, this.layoutPath(watched));
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
