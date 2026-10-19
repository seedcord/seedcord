import { describe, expect, it } from 'vitest';

import { postPreview } from '#lib/linkPreview';
import { POST } from '#tests/fixtures/post';

const dayIn = (timeZone: string, seconds: number): string =>
    new Date(seconds * 1000).toLocaleDateString('en-CA', { timeZone });

describe('postPreview', () => {
    it('shows the author, a discord date, and the read time', () => {
        const [byline, date, minutes] = postPreview(POST).subtext ?? [];

        expect([byline, minutes]).toEqual(['**Dhruv**', '6 min read']);
        expect(date).toMatch(/^<t:\d+:D>$/);
    });

    it.each(['America/Los_Angeles', 'Pacific/Noumea'])('shows the post date to a reader in %s', (timeZone) => {
        const seconds = Number(/<t:(\d+):D>/.exec(postPreview(POST).subtext?.[1] ?? '')?.[1]);

        expect(dayIn(timeZone, seconds)).toBe(POST.created);
    });

    it('joins several authors into one list', () => {
        const [dhruv] = POST.authors;
        if (dhruv === undefined) throw new Error('the fixture post has an author');
        const authors = ['Alex', 'Sam'].map((name) => ({ ...dhruv, name }));

        expect(postPreview({ ...POST, authors: [dhruv, ...authors] }).subtext?.[0]).toBe('**Dhruv, Alex, and Sam**');
    });

    it('leaves the banner out when the post has no cover', () => {
        expect(postPreview(POST).bannerUrl).toBeUndefined();
    });
});
