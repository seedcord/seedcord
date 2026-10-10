import { readdir } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { isInside } from '@seedcord/utils/node/internal';

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

function isSkippedName(name: string): boolean {
    return name.startsWith('.') || name === 'node_modules';
}

// the shape vite gives import.meta.glob keys and root imports, root-relative with a leading slash
export function viteKey(root: string, path: string): string {
    return `/${relative(root, path).split(sep).join('/')}`;
}

interface ProjectEntry {
    path: string;
    isFolder: boolean;
}

export class ProjectFiles {
    private readonly skippedFolders: string[];

    constructor(
        private readonly root: string,
        outDir: string,
        private readonly configDir: string
    ) {
        const projectFolders = this.rootIsConfigDir() ? PROJECT_FOLDERS.map((name) => join(root, name)) : [];
        this.skippedFolders = [outDir, ...projectFolders];
    }

    // vite also passes virtual ids like \0seedcord:entry here
    // isInside resolves a relative path against process.cwd()
    public holds(path: string): boolean {
        return isAbsolute(path) && isInside(this.root, path);
    }

    public keyOf(path: string): string {
        return viteKey(this.root, path);
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
    public globExcludes(): string[] {
        const folders = this.skippedFolders.filter((folder) => this.holds(folder));
        const files = this.rootIsConfigDir() ? PROJECT_FILES : [];
        return [
            '!**/node_modules/**',
            '!**/.*',
            '!**/.*/**',
            ...folders.map((folder) => `!.${this.keyOf(folder)}/**`),
            ...files.map((file) => `!./${file}`)
        ];
    }

    private entries(): Promise<ProjectEntry[]> {
        return Array.fromAsync(this.entriesUnder(this.root));
    }

    private async *entriesUnder(dir: string): AsyncGenerator<ProjectEntry> {
        const entries = await readdir(dir, { withFileTypes: true }).catch((error: unknown) => {
            throw new SeedcordError(SeedcordErrorCode.CoreDirectoryUnreadable, [dir], { cause: error });
        });
        for (const entry of entries) {
            const path = join(dir, entry.name);
            if (isSkippedName(entry.name) || this.skippedFolders.includes(path)) continue;
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
