import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

// root-relative keys with a leading slash, the shape vite gives import.meta.glob keys
function keyOf(root: string, dir: string): string {
    return `/${relative(root, dir).split(sep).join('/')}`;
}

function isSkippedName(name: string): boolean {
    return name.startsWith('.') || name === 'node_modules';
}

export class ProjectFiles {
    constructor(
        private readonly root: string,
        private readonly outDir: string
    ) {}

    // every folder under root the build bundles from, empty ones included
    public async folders(): Promise<string[]> {
        const found: string[] = [];
        const walk = async (dir: string): Promise<void> => {
            for (const entry of await readdir(dir, { withFileTypes: true })) {
                const full = join(dir, entry.name);
                if (!entry.isDirectory() || isSkippedName(entry.name) || full === this.outDir) continue;
                found.push(keyOf(this.root, full));
                await walk(full);
            }
        };

        await walk(this.root);
        return found.sort();
    }

    // negative glob patterns that keep the same folders out of both globs
    public excludes(): string[] {
        const patterns = ['!**/node_modules/**', '!**/.*', '!**/.*/**'];
        const out = relative(this.root, this.outDir);
        if (out !== '' && !out.startsWith('..')) patterns.push(`!${keyOf(this.root, this.outDir)}/**`);
        return patterns;
    }
}
