import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuideSearch, TooManySearches } from '#src/GuideSearch';
import { QUESTION_LENGTH } from '#src/question';

import type { GuideHit } from '#src/guideSections';

afterEach(() => vi.unstubAllGlobals());

const ENDPOINT = 'https://seedcord.org/guide/api/ask';
const SIGNAL = new AbortController().signal;

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
        const hit: GuideHit = {
            path: '/components/buttons#one-handler',
            tab: 'Components',
            page: 'Buttons',
            heading: 'One handler'
        };
        const asked = answering(Response.json([hit]));

        expect(await new GuideSearch(ENDPOINT).search('  how do i make a button ', SIGNAL)).toEqual([
            { ...hit, url: 'https://seedcord.org/guide/components/buttons#one-handler', by: 'meaning' }
        ]);
        expect(asked).toEqual([`${ENDPOINT}?q=how+do+i+make+a+button`]);
    });

    it('sends nothing for a question too short or too long to ask', async () => {
        const asked = answering(Response.json([]));
        const search = new GuideSearch(ENDPOINT);

        expect(await search.search('   ', SIGNAL)).toEqual([]);
        expect(await search.search(' k ', SIGNAL)).toEqual([]);
        expect(await search.search('k'.repeat(QUESTION_LENGTH.max + 1), SIGNAL)).toEqual([]);
        expect(asked).toEqual([]);
    });

    it('throws how long to wait once the visitor runs out of searches', async () => {
        answering(new Response(null, { status: 429, headers: { 'retry-after': '60' } }));

        await expect(new GuideSearch(ENDPOINT).search('button', SIGNAL)).rejects.toEqual(new TooManySearches(60));
    });

    it('throws a plain status error for a 429 with no wait in seconds', async () => {
        for (const headers of [{}, { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' }]) {
            answering(new Response(null, { status: 429, headers }));

            const failure = new GuideSearch(ENDPOINT).search('button', SIGNAL);

            await expect(failure).rejects.toThrow(/429/);
            await expect(failure).rejects.not.toBeInstanceOf(TooManySearches);
        }
    });

    it('throws with the status when the endpoint fails another way', async () => {
        answering(new Response(null, { status: 500 }));

        await expect(new GuideSearch(ENDPOINT).search('button', SIGNAL)).rejects.toThrow(/500/);
    });
});
