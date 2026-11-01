import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';

import { embedding } from '@seedcord/docs-search';

type Embed = (documents: readonly string[]) => Promise<number[][]>;

interface Vectors {
    bytes: Uint8Array;
    embedded: number;
}

const fileName = (document: string): string =>
    `${createHash('sha256').update(embedding.model).update('\0').update(document).digest('hex')}.bin`;

export class EmbeddingCache {
    constructor(private readonly folder: URL) {}

    async vectors(documents: readonly string[], embed: Embed): Promise<Vectors> {
        await mkdir(this.folder, { recursive: true });
        const entries = documents.map((document) => ({ document, name: fileName(document) }));
        const missing = entries.filter(({ name }) => !existsSync(this.file(name)));

        const fresh = missing.length > 0 ? await embed(missing.map(({ document }) => document)) : [];
        for (const [index, { name }] of missing.entries()) {
            const vector = fresh[index];
            if (vector === undefined)
                throw new Error(`embed returned ${fresh.length} vectors for ${missing.length} texts`);
            await writeFile(this.file(name), new Float32Array(vector));
        }

        const keep = new Set(entries.map(({ name }) => name));
        for (const name of await readdir(this.folder)) {
            if (!keep.has(name)) await rm(this.file(name));
        }

        const bytes = Buffer.concat(await Promise.all(entries.map(({ name }) => readFile(this.file(name)))));
        return { bytes, embedded: missing.length };
    }

    private file(name: string): URL {
        return new URL(name, this.folder);
    }
}
