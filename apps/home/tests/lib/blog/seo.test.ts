import { describe, expect, it } from 'vitest';

import { postMetadata } from '#lib/blog/seo';
import { POST } from '#tests/fixtures/post';

describe('postMetadata', () => {
    it('sets noindex and leaves out the markdown copy link on an unlisted post', () => {
        const metadata = postMetadata({ ...POST, unlisted: true });

        expect(metadata.robots).toEqual({ index: false, follow: false });
        expect(metadata.alternates?.types).not.toHaveProperty('text/markdown');
    });

    it('sets no robots rule on a listed post', () => {
        expect(postMetadata(POST).robots).toBeNull();
    });
});
