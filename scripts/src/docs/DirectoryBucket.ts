import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { SiteBucket } from '#src/docs/DocsSiteUpload';

function isMissing(error: unknown): boolean {
    return Error.isError(error) && 'code' in error && error.code === 'ENOENT';
}

// the docs bucket's layout on disk, for `pnpm docs:preview`
export class DirectoryBucket implements SiteBucket {
    constructor(private readonly root: string) {}

    async putFile(key: string, filePath: string): Promise<void> {
        const target = await this.prepare(key);
        await copyFile(filePath, target);
    }

    async readText(key: string): Promise<string | null> {
        try {
            return await readFile(path.join(this.root, key), 'utf8');
        } catch (error) {
            if (isMissing(error)) return null;
            throw error;
        }
    }

    async writeText(key: string, text: string): Promise<void> {
        await writeFile(await this.prepare(key), text);
    }

    async folders(prefix: string): Promise<string[]> {
        try {
            const entries = await readdir(path.join(this.root, prefix), { withFileTypes: true });
            return entries.filter((entry) => entry.isDirectory()).map((entry) => `${prefix}${entry.name}/`);
        } catch (error) {
            if (isMissing(error)) return [];
            throw error;
        }
    }

    async deleteFolder(folder: string): Promise<void> {
        await rm(path.join(this.root, folder), { recursive: true, force: true });
    }

    private async prepare(key: string): Promise<string> {
        const target = path.join(this.root, key);
        await mkdir(path.dirname(target), { recursive: true });
        return target;
    }
}
