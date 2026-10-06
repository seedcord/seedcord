import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

import { BUILT_FILES_KEY, isInside } from '@seedcord/utils/node/internal';

export const BUILT_FILES_SLOT = `globalThis[Symbol.for(${JSON.stringify(BUILT_FILES_KEY)})]`;

function isSkippedName(name: string): boolean {
    return name.startsWith('.') || name === 'node_modules';
}

// sit under root only when root is the project folder. logs/ is where the bot writes its log files
const PROJECT_FILES = [
    '/seedcord.config.*',
    '/tsconfig*.json',
    '/package.json',
    '/pnpm-lock.yaml',
    '/package-lock.json',
    '/yarn.lock',
    '/bun.lock',
    '/bun.lockb',
    '/logs/**'
];

export class ProjectFiles {
    constructor(
        public readonly root: string,
        private readonly outDir: string
    ) {}

    public holds(path: string): boolean {
        return isInside(this.root, path);
    }

    // the shape vite gives import.meta.glob keys, root-relative with a leading slash
    public keyOf(path: string): string {
        return `/${relative(this.root, path).split(sep).join('/')}`;
    }

    // empty ones included
    public async folders(): Promise<string[]> {
        const found: string[] = [];
        const walk = async (dir: string): Promise<void> => {
            for (const entry of await readdir(dir, { withFileTypes: true })) {
                const full = join(dir, entry.name);
                if (!entry.isDirectory() || isSkippedName(entry.name) || full === this.outDir) continue;
                if (full === join(this.root, 'logs')) continue;
                found.push(this.keyOf(full));
                await walk(full);
            }
        };

        await walk(this.root);
        return found.sort();
    }

    public globExcludes(): string[] {
        const patterns = ['!**/node_modules/**', '!**/.*', '!**/.*/**', ...PROJECT_FILES.map((file) => `!${file}`)];
        if (this.holds(this.outDir)) patterns.push(`!${this.keyOf(this.outDir)}/**`);
        return patterns;
    }
}
