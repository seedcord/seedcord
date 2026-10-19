import { describe, expect, it } from 'vitest';

import { postPreview } from '#lib/linkPreview';
import { POST } from '#tests/fixtures/post';

describe('postPreview', () => {
    it('shows the author, a discord date in seconds, and the read time', () => {
        expect(postPreview(POST).subtext).toEqual(['**Dhruv**', `<t:${Date.UTC(2026, 9, 19) / 1000}:D>`, '6 min read']);
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
