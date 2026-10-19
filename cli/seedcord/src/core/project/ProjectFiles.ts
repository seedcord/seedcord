import { readdirSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError, BotLayout, isInside } from '@seedcord/utils/internal';
import { minimatch } from 'minimatch';

import type { ResolvedSeedcordConfig } from '#core/config/schema';

// WinstonFileSink writes logs/ under the cwd. seedcord dev and a built bot start in the config's folder
const LOGS_FOLDER = 'logs';
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

interface ProjectEntry {
    path: string;
    isFolder: boolean;
}

type ProjectPaths = Pick<ResolvedSeedcordConfig, 'root' | 'configFile' | 'files' | 'target'>;

function projectFilesIn(configDir: string): string[] {
    return readdirSync(configDir)
        .filter((name) => PROJECT_FILES.some((pattern) => minimatch(name, pattern)))
        .map((name) => join(configDir, name));
}

function layoutOf({ root, configFile, files, target }: ProjectPaths): BotLayout {
    const configDir = dirname(configFile);
    const keysUnderRoot = (paths: string[]): string[] =>
        paths.filter((path) => isInside(root, path)).map((path) => BotLayout.keyUnder(root, path));
    const outDir = target.kind === 'server' ? [target.outDir] : [];

    return new BotLayout({
        root,
        listed: files.map((folder) => BotLayout.keyUnder(root, folder)),
        skippedFolders: keysUnderRoot([...outDir, join(configDir, LOGS_FOLDER)]),
        projectFiles: keysUnderRoot(projectFilesIn(configDir))
    });
}

export class ProjectFiles {
    public readonly layout: BotLayout;

    constructor(paths: ProjectPaths) {
        this.layout = layoutOf(paths);
    }

    // sorted by path, the order importFiles loads them in
    public async modulePaths(folder = this.layout.root): Promise<string[]> {
        this.layout.assertBundled(folder);
        const entries = await Array.fromAsync(this.entriesUnder(folder));
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

    private entries(): Promise<ProjectEntry[]> {
        return Array.fromAsync(this.entriesUnder(this.layout.root));
    }

    private async *entriesUnder(dir: string): AsyncGenerator<ProjectEntry> {
        const entries = await readdir(dir, { withFileTypes: true }).catch((error: unknown) => {
            throw new SeedcordError(SeedcordErrorCode.CorePathUnreadable, [dir, asError(error).message], {
                cause: error
            });
        });
        for (const entry of entries) {
            const path = join(dir, entry.name);
            if (this.layout.isSkipped(path)) continue;
            if (entry.isDirectory()) {
                yield { path, isFolder: true };
                yield* this.entriesUnder(path);
            } else {
                yield { path, isFolder: false };
            }
        }
    }
}
