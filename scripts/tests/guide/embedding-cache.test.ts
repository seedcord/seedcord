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

// each document's vector carries its first character code
const vectorsFor = (documents: readonly string[]): Promise<number[][]> =>
    Promise.resolve(documents.map((document) => [document.charCodeAt(0), 1]));

const decoded = (bytes: Uint8Array): number[] => [...new Float32Array(new Uint8Array(bytes).buffer)];

describe('EmbeddingCache', () => {
    it('embeds once, then reuses the vectors for the same documents', async () => {
        await using folder = await tempFolder();
        const embed = vi.fn(vectorsFor);
        const cache = new EmbeddingCache(folder.url);

        const first = await cache.vectors(['a', 'b'], embed);
        const again = await cache.vectors(['a', 'b'], embed);

        expect(embed).toHaveBeenCalledOnce();
        expect([first.embedded, again.embedded]).toEqual([2, 0]);
        expect(decoded(again.bytes)).toEqual([97, 1, 98, 1]);
    });

    it('embeds only the documents that changed, and deletes the ones that are gone', async () => {
        await using folder = await tempFolder();
        const embed = vi.fn(vectorsFor);
        const cache = new EmbeddingCache(folder.url);

        await cache.vectors(['a', 'b'], embed);
        const edited = await cache.vectors(['a', 'c'], embed);
        await cache.vectors(['a', 'b'], embed);

        expect(embed.mock.calls).toEqual([[['a', 'b']], [['c']], [['b']]]);
        expect(decoded(edited.bytes)).toEqual([97, 1, 99, 1]);
    });
});
