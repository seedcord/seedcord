import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuideSearch, QUESTION_LENGTH } from '#src/GuideSearch';

import type { GuideHit } from '#src/guideSections';

afterEach(() => vi.unstubAllGlobals());

const ENDPOINT = 'https://seedcord.org/guide/api/ask';

function answering(response: Response): string[] {
    const asked: string[] = [];
    vi.stubGlobal('fetch', (url: URL) => {
        asked.push(url.toString());
        return Promise.resolve(response);
    });
    return asked;
}

describe('GuideSearch', () => {
    it('asks the endpoint and gives each hit its full url', async () => {
        const hit: GuideHit = { path: '/components/buttons#one-handler', page: 'Buttons', heading: 'One handler' };
        const asked = answering(Response.json([hit]));

        expect(await new GuideSearch(ENDPOINT).search('  how do i make a button ')).toEqual([
            { ...hit, url: 'https://seedcord.org/guide/components/buttons#one-handler' }
        ]);
        expect(asked).toEqual([`${ENDPOINT}?q=how+do+i+make+a+button`]);
    });

    it('sends nothing for a question too short or too long to ask', async () => {
        const asked = answering(Response.json([]));
        const search = new GuideSearch(ENDPOINT);

        expect(await search.search('   ')).toEqual([]);
        expect(await search.search(' k ')).toEqual([]);
        expect(await search.search('k'.repeat(QUESTION_LENGTH.max + 1))).toEqual([]);
        expect(asked).toEqual([]);
    });

    it('throws with the status when the endpoint refuses', async () => {
        answering(new Response(null, { status: 429 }));

        await expect(new GuideSearch(ENDPOINT).search('button')).rejects.toThrow(/429/);
    });
});
