import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

import type { SiteBucket } from '#src/docs/DocsSiteUpload';

// the docs bucket's layout on disk, for `pnpm docs:preview`
export class DirectoryBucket implements SiteBucket {
    constructor(private readonly root: string) {}

    async putFile(key: string, filePath: string): Promise<void> {
        const target = path.join(this.root, key);
        await mkdir(path.dirname(target), { recursive: true });
        await copyFile(filePath, target);
    }

    async folders(prefix: string): Promise<string[]> {
        const entries = await readdir(path.join(this.root, prefix), { withFileTypes: true }).catch(() => []);
        return entries.filter((entry) => entry.isDirectory()).map((entry) => `${prefix}${entry.name}/`);
    }

    async deleteFolder(folder: string): Promise<void> {
        await rm(path.join(this.root, folder), { recursive: true, force: true });
    }
}
