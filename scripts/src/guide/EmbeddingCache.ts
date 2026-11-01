import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

import { embedding } from '@seedcord/docs-search';

type Embed = (documents: readonly string[]) => Promise<number[][]>;

interface Vectors {
    bytes: Uint8Array;
    reused: boolean;
}

export class EmbeddingCache {
    constructor(private readonly folder: URL) {}

    async vectors(documents: readonly string[], embed: Embed): Promise<Vectors> {
        const key = createHash('sha256').update(embedding.model).update(JSON.stringify(documents)).digest('hex');
        const file = new URL(`${key}.bin`, this.folder);
        if (existsSync(file)) return { bytes: await readFile(file), reused: true };

        const embedded = await embed(documents);
        const bytes = new Uint8Array(new Float32Array(embedded.flat()).buffer);
        await rm(this.folder, { recursive: true, force: true });
        await mkdir(this.folder, { recursive: true });
        await writeFile(file, bytes);
        return { bytes, reused: false };
    }
}
