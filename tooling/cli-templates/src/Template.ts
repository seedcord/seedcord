import { readdir } from 'node:fs/promises';

import { hasErrorCode } from '@seedcord/utils/internal';

import type { Dirent } from 'node:fs';

const SHARED_FOLDER_PREFIX = '_';

async function entriesOf(dir: string): Promise<Dirent[]> {
    try {
        return await readdir(dir, { withFileTypes: true });
    } catch (error: unknown) {
        if (hasErrorCode(error, 'ENOENT')) return [];
        throw error;
    }
}

export class Template {
    private constructor(
        public readonly name: string,
        public readonly from: string
    ) {}

    public static async readAll(dir: string, from: string): Promise<Template[]> {
        const entries = await entriesOf(dir);
        return entries
            .filter((entry) => entry.isDirectory() && !entry.name.startsWith(SHARED_FOLDER_PREFIX))
            .map((entry) => new Template(entry.name, from))
            .toSorted((a, b) => a.name.localeCompare(b.name));
    }
}
