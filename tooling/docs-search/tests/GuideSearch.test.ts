import { SiteAddress } from '@seedcord/brand';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuideSearch } from '#src/GuideSearch';
import { ASK_WAIT_STATUS, SearchUnavailable } from '#src/SearchUnavailable';

import { askedQuestion } from './askedQuestion';

import type { GuideHit } from '#src/guideSections';

afterEach(() => vi.unstubAllGlobals());

const SITE = new SiteAddress('https://next.seedcord.org/guide');
const ENDPOINT = 'https://next.seedcord.org/guide/api/ask';
const SIGNAL = new AbortController().signal;

function answering(response: Response): string[] {
    const asked: string[] = [];
    vi.stubGlobal('fetch', (url: string) => {
        asked.push(url);
        return Promise.resolve(response);
    });
    return asked;
}

describe('GuideSearch', () => {
    it('asks the site it was given and links each hit to that same site', async () => {
        const hit: GuideHit = {
            path: '/components/buttons#one-handler',
            tab: 'Components',
            page: 'Buttons',
            heading: 'One handler'
        };
        const asked = answering(Response.json([hit]));

        expect(await new GuideSearch(SITE).search(askedQuestion('  how do i make a button '), SIGNAL)).toEqual([
            { ...hit, url: `${SITE.url}/components/buttons#one-handler`, by: 'meaning' }
        ]);
        expect(asked).toEqual([`${ENDPOINT}?q=how+do+i+make+a+button`]);
    });

    it.each([
        [ASK_WAIT_STATUS.tooManySearches, '45', 'Too many searches. Try again in 45 seconds.'],
        [ASK_WAIT_STATUS.outOfAllowance, '25200', 'Search used up its daily allowance. Try again in 7 hours.']
    ])('says why it has to wait and for how long on a %i', async (status, retryAfter, message) => {
        answering(new Response(null, { status, headers: { 'retry-after': retryAfter } }));

        const failure = new GuideSearch(SITE).search(askedQuestion('button'), SIGNAL);

        await expect(failure).rejects.toBeInstanceOf(SearchUnavailable);
        await expect(failure).rejects.toThrow(message);
    });

    it('throws a plain status error for a 429 with no wait in seconds', async () => {
        for (const headers of [{}, { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' }]) {
            answering(new Response(null, { status: ASK_WAIT_STATUS.tooManySearches, headers }));

            const failure = new GuideSearch(SITE).search(askedQuestion('button'), SIGNAL);

            await expect(failure).rejects.toThrow(/429/);
            await expect(failure).rejects.not.toBeInstanceOf(SearchUnavailable);
        }
    });

    it('throws with the status and leaves the question out when the endpoint fails another way', async () => {
        answering(new Response(null, { status: 500 }));

        await expect(new GuideSearch(SITE).search(askedQuestion('button'), SIGNAL)).rejects.toThrow(
            new Error(`${ENDPOINT} failed to load with status 500`)
        );
    });

    it('leaves the question out when the request never reaches the server', async () => {
        vi.stubGlobal('fetch', () => Promise.reject(new TypeError('fetch failed')));

        await expect(new GuideSearch(SITE).search(askedQuestion('button'), SIGNAL)).rejects.toThrow(
            new Error(`${ENDPOINT} failed to load because the request never reached the server`)
        );
    });
});
