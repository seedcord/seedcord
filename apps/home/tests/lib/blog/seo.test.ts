import { describe, expect, it } from 'vitest';

import { postMetadata } from '#lib/blog/seo';
import { POST } from '#tests/fixtures/post';

describe('postMetadata', () => {
    it('sets noindex and nofollow on an unlisted post', () => {
        expect(postMetadata({ ...POST, unlisted: true }).robots).toEqual({ index: false, follow: false });
    });

    it('sets no robots rule on a listed post', () => {
        expect(postMetadata(POST).robots).toBeUndefined();
    });
});
