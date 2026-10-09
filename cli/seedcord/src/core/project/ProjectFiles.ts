import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

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

    public holds(path: string): boolean {
        return isInside(this.root, path);
    }

    // the shape vite gives import.meta.glob keys, root-relative with a leading slash
    public keyOf(path: string): string {
        return `/${relative(this.root, path).split(sep).join('/')}`;
    }

    public async foldersIncludingEmpty(): Promise<string[]> {
        const found: string[] = [];
        for await (const { path, isFolder } of this.entriesUnder(this.root)) {
            if (isFolder) found.push(this.keyOf(path));
        }
        return found.toSorted();
    }

    public async pathsWithHash(): Promise<string[]> {
        const found: string[] = [];
        for await (const { path } of this.entriesUnder(this.root)) {
            if (relative(this.root, path).includes('#')) found.push(path);
        }
        return found.toSorted();
    }

    public globExcludes(): string[] {
        const folders = this.skippedFolders.filter((folder) => this.holds(folder));
        const files = this.rootIsConfigDir() ? PROJECT_FILES : [];
        return [
            '!**/node_modules/**',
            '!**/.*',
            '!**/.*/**',
            ...folders.map((folder) => `!${this.keyOf(folder)}/**`),
            ...files.map((file) => `!/${file}`)
        ];
    }

    private async *entriesUnder(dir: string): AsyncGenerator<{ path: string; isFolder: boolean }> {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
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
