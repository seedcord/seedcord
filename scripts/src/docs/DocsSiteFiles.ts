import { readdir } from 'node:fs/promises';
import path from 'node:path';

export interface DocsSiteFile {
    key: string;
    path: string;
}

export class DocsSiteFiles {
    constructor(private readonly root: string) {}

    async list(): Promise<DocsSiteFile[]> {
        const entries = await readdir(this.root, { recursive: true, withFileTypes: true });
        return entries.reduce<DocsSiteFile[]>((files, entry) => {
            if (!entry.isFile()) return files;

            const absolute = path.join(entry.parentPath, entry.name);
            files.push({ key: path.relative(this.root, absolute).split(path.sep).join('/'), path: absolute });
            return files;
        }, []);
    }
}
