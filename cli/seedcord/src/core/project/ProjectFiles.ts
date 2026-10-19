import { readdir } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import {
    asError,
    isInside,
    isModulePath,
    isSkippedUnder,
    moduleGlobs,
    nonCodeGlobs,
    posixRelative,
    SKIPPED_GLOBS
} from '@seedcord/utils/internal';

import type { ResolvedSeedcordConfig } from '#core/config/schema';

// the bot writes its log files to logs/ in the folder it starts in
const PROJECT_FOLDERS = ['logs'];
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

// the shape vite gives import.meta.glob keys and root imports, root-relative with a leading slash
export function viteKey(root: string, path: string): string {
    return `/${posixRelative(root, path)}`;
}

interface ProjectEntry {
    path: string;
    isFolder: boolean;
}

type ProjectPaths = Pick<ResolvedSeedcordConfig, 'root' | 'configFile' | 'files' | 'target'>;

export class ProjectFiles {
    private readonly root: string;
    private readonly configDir: string;
    private readonly listedFolders: string[];
    private readonly skippedFolders: string[];

    constructor({ root, configFile, files, target }: ProjectPaths) {
        this.root = root;
        this.configDir = dirname(configFile);
        this.listedFolders = files;
        const projectFolders = this.rootIsConfigDir() ? PROJECT_FOLDERS.map((name) => join(root, name)) : [];
        this.skippedFolders = target.kind === 'server' ? [target.outDir, ...projectFolders] : projectFolders;
    }

    // vite also passes virtual ids like \0seedcord:entry here
    // isInside resolves a relative path against process.cwd()
    public holds(path: string): boolean {
        return isAbsolute(path) && isInside(this.root, path);
    }

    public keyOf(path: string): string {
        return viteKey(this.root, path);
    }

    public listedKeys(): string[] {
        return this.listedFolders.map((folder) => this.keyOf(folder));
    }

    public isBundled(path: string): boolean {
        if (this.skippedFolders.some((skipped) => isInside(skipped, path))) return false;
        return !isSkippedUnder(this.root, path);
    }

    public async modulePaths(): Promise<string[]> {
        const entries = await this.entries();
        return entries.filter(({ path, isFolder }) => !isFolder && isModulePath(path)).map(({ path }) => path);
    }

    public async foldersIncludingEmpty(): Promise<string[]> {
        const entries = await this.entries();
        return entries
            .filter(({ isFolder }) => isFolder)
            .map(({ path }) => this.keyOf(path))
            .toSorted();
    }

    public async pathsWithHash(): Promise<string[]> {
        const entries = await this.entries();
        return entries
            .map(({ path }) => path)
            .filter((path) => basename(path).includes('#') && !relative(this.root, dirname(path)).includes('#'))
            .toSorted();
    }

    // the built files globs use root as their base
    public moduleGlobs(): string[] {
        return [...moduleGlobs('.'), ...this.globExcludes()];
    }

    public listedFileGlobs(): string[] {
        return [...this.listedFolders.flatMap((folder) => nonCodeGlobs(this.globBase(folder))), ...this.globExcludes()];
    }

    private globBase(folder: string): string {
        const relativePath = posixRelative(this.root, folder);
        return relativePath === '' ? '.' : `./${relativePath}`;
    }

    private globExcludes(): string[] {
        const folders = this.skippedFolders.filter((folder) => this.holds(folder));
        const files = this.rootIsConfigDir() ? PROJECT_FILES : [];
        return [
            ...SKIPPED_GLOBS,
            ...folders.map((folder) => `!.${this.keyOf(folder)}/**`),
            ...files.map((file) => `!./${file}`)
        ];
    }

    private entries(): Promise<ProjectEntry[]> {
        return Array.fromAsync(this.entriesUnder(this.root));
    }

    private async *entriesUnder(dir: string): AsyncGenerator<ProjectEntry> {
        const entries = await readdir(dir, { withFileTypes: true }).catch((error: unknown) => {
            throw new SeedcordError(SeedcordErrorCode.CorePathUnreadable, [dir, asError(error).message], {
                cause: error
            });
        });
        for (const entry of entries) {
            const path = join(dir, entry.name);
            if (!this.isBundled(path)) continue;
            if (entry.isDirectory()) {
                yield { path, isFolder: true };
                yield* this.entriesUnder(path);
            } else {
                yield { path, isFolder: false };
            }
        }
    }

    private rootIsConfigDir(): boolean {
        return this.root === this.configDir;
    }
}
