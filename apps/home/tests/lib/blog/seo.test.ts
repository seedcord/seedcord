import { describe, expect, it } from 'vite-plus/test';

import { postMetadata } from '#lib/blog/seo';
import { DEFAULT_OG_IMAGE } from '#lib/site';
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

    it('shares the thumbnail as the preview image', () => {
        const thumbnail = { src: '/blog/typed-custom-ids/thumbnail.webp', width: 1600, height: 900 };
        const metadata = postMetadata({ ...POST, thumbnail });

        expect(metadata.openGraph?.images).toEqual([{ url: thumbnail.src, width: 1600, height: 900 }]);
        expect(metadata.twitter?.images).toEqual(metadata.openGraph?.images);
    });

    it('shares the site card on a post without a thumbnail', () => {
        expect(postMetadata(POST).openGraph?.images).toEqual([DEFAULT_OG_IMAGE]);
    });
});
