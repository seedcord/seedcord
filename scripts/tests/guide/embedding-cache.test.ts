import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { EmbeddingCache } from '#src/guide/EmbeddingCache';

async function tempFolder(): Promise<AsyncDisposable & { url: URL }> {
    const path = await mkdtemp(join(tmpdir(), 'embedding-cache-'));
    return {
        url: pathToFileURL(`${path}/`),
        [Symbol.asyncDispose]: () => rm(path, { recursive: true, force: true })
    };
}

const vectorsFor = (documents: readonly string[]): Promise<number[][]> =>
    Promise.resolve(documents.map((_, index) => [index, 1]));

describe('EmbeddingCache', () => {
    it('embeds once, then reuses the vectors for the same documents', async () => {
        await using folder = await tempFolder();
        const embed = vi.fn(vectorsFor);
        const cache = new EmbeddingCache(folder.url);

        const first = await cache.vectors(['a', 'b'], embed);
        const again = await cache.vectors(['a', 'b'], embed);

        expect(embed).toHaveBeenCalledOnce();
        expect(first.reused).toBe(false);
        expect(again.reused).toBe(true);
        expect([...again.bytes]).toEqual([...first.bytes]);
    });

    it('embeds again once a document changes, and drops the vectors for the old list', async () => {
        await using folder = await tempFolder();
        const embed = vi.fn(vectorsFor);
        const cache = new EmbeddingCache(folder.url);

        await cache.vectors(['a', 'b'], embed);
        await cache.vectors(['a', 'c'], embed);
        const old = await cache.vectors(['a', 'b'], embed);

        expect(embed).toHaveBeenCalledTimes(3);
        expect(old.reused).toBe(false);
    });
});
