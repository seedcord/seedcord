import { describe, expect, it } from 'vitest';

import { postPreview } from '#lib/linkPreview';
import { POST } from '#tests/fixtures/post';

const dayIn = (timeZone: string, seconds: number): string =>
    new Date(seconds * 1000).toLocaleDateString('en-CA', { timeZone });

describe('postPreview', () => {
    it('shows the author, a discord date, and the read time', () => {
        const [byline, , minutes] = postPreview(POST).subtext ?? [];

        expect([byline, minutes]).toEqual(['**Dhruv**', '6 min read']);
    });

    it.each(['America/Los_Angeles', 'Pacific/Noumea'])('shows the post date to a reader in %s', (timeZone) => {
        const seconds = Number(/<t:(\d+):D>/.exec(postPreview(POST).subtext?.[1] ?? '')?.[1]);

        expect(dayIn(timeZone, seconds)).toBe(POST.created);
    });

    it('links the markdown copy of a listed post only', () => {
        const labels = (unlisted: boolean): string[] =>
            postPreview({ ...POST, unlisted }).links.map((link) => link.label);

        expect(labels(false)).toContain('Markdown');
        expect(labels(true)).not.toContain('Markdown');
    });

    it('leaves the banner out when the post has no cover', () => {
        expect(postPreview(POST).bannerUrl).toBeUndefined();
    });
});
