import { embedding } from '@seedcord/docs-search';
import { expect, it } from 'vite-plus/test';

import { WorkersAi } from '#src/guide/WorkersAi';
import { CloudflareApi, type HttpFetch } from '#src/lib/CloudflareApi';

function fakeWorkersAi(resultFor: (texts: string[]) => unknown): { ai: WorkersAi; calls: [string, number][] } {
    const calls: [string, number][] = [];
    const http: HttpFetch = (url, init) => {
        // justified: WorkersAi always sends a JSON body
        const { text } = JSON.parse(init?.body ?? '{}') as { text: string[] };
        calls.push([url, text.length]);
        const result = resultFor(text);
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true, result }) });
    };
    return { ai: new WorkersAi('account-1', new CloudflareApi('secret', http)), calls };
}

it('embeds in batches of 100 and keeps the vectors in input order', async () => {
    const { ai, calls } = fakeWorkersAi((texts) => ({ data: texts.map((value) => [Number(value)]) }));
    const texts = Array.from({ length: 150 }, (_, index) => String(index));

    const vectors = await ai.embed(texts);

    const url = `https://api.cloudflare.com/client/v4/accounts/account-1/ai/run/${embedding.model}`;
    expect(calls).toEqual([
        [url, 100],
        [url, 50]
    ]);
    expect(vectors).toEqual(texts.map((value) => [Number(value)]));
});

it('throws when a batch comes back with fewer vectors than texts', async () => {
    const { ai } = fakeWorkersAi((texts) => ({ data: texts.slice(1).map(() => [0]) }));

    await expect(ai.embed(['a', 'b'])).rejects.toThrow(/1 vectors for 2 texts/);
});

it('throws when the result carries no vectors', async () => {
    const { ai } = fakeWorkersAi(() => ({ shape: [] }));

    await expect(ai.embed(['a'])).rejects.toThrow(/returned no embeddings/);
});
