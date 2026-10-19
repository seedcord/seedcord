import { describe, expect, it } from 'vitest';

import { blogMetadata, postMetadata } from '#lib/blog/seo';
import { DEFAULT_OG_IMAGE } from '#lib/site';
import { POST } from '#tests/fixtures/post';

// next replaces the layout's openGraph and twitter objects with a page's own
describe('blogMetadata', () => {
    it('sets the site image for open graph and twitter', () => {
        const { openGraph, twitter } = blogMetadata();

        expect(openGraph?.images).toEqual([DEFAULT_OG_IMAGE]);
        expect(twitter?.images).toEqual([DEFAULT_OG_IMAGE]);
    });
});

describe('postMetadata', () => {
    it('sets noindex and nofollow on an unlisted post', () => {
        expect(postMetadata({ ...POST, unlisted: true }).robots).toEqual({ index: false, follow: false });
    });

    it('sets no robots rule on a listed post', () => {
        expect(postMetadata(POST).robots).toBeUndefined();
    });
});
