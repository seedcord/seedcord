import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it, vi } from 'vite-plus/test';

import { EmbeddingCache } from '#src/guide/EmbeddingCache';

async function tempFolder(): Promise<AsyncDisposable & { url: URL }> {
    const path = await mkdtemp(join(tmpdir(), 'embedding-cache-'));
    return {
        url: pathToFileURL(`${path}/`),
        [Symbol.asyncDispose]: () => rm(path, { recursive: true, force: true })
    };
}

// each document's vector has its first character code
const vectorsFor = (documents: readonly string[]): Promise<number[][]> =>
    Promise.resolve(documents.map((document) => [document.charCodeAt(0), 1]));

const decoded = (bytes: Uint8Array): number[] => [...new Float32Array(new Uint8Array(bytes).buffer)];

describe('EmbeddingCache', () => {
    it('embeds only the documents without vectors, and deletes the ones that were removed', async () => {
        await using folder = await tempFolder();
        const embed = vi.fn(vectorsFor);
        const cache = new EmbeddingCache(folder.url);

        const first = await cache.vectors(['a', 'b'], embed);
        const edited = await cache.vectors(['a', 'c'], embed);
        const back = await cache.vectors(['a', 'b'], embed);

        expect(embed.mock.calls).toEqual([[['a', 'b']], [['c']], [['b']]]);
        expect([first.embedded, edited.embedded, back.embedded]).toEqual([2, 1, 1]);
        expect(decoded(edited.bytes)).toEqual([97, 1, 99, 1]);
    });
});
