import { describe, expect, it } from 'vite-plus/test';

import { Post } from '#lib/blog/Post.ts';

import type { BlogPost } from '#lib/blog/source.ts';

const COVER = { src: '/blog/a-post/cover.webp', width: 2048, height: 608, alt: 'the cover' };
const THUMBNAIL = { src: '/blog/a-post/thumbnail.webp', width: 1600, height: 900 };

function summaryOf(images: object): ReturnType<Post['summary']> {
    // only the fields summary() reads
    const page = {
        path: 'a-post/index.mdx',
        absolutePath: '/content/blog/a-post/index.mdx',
        data: {
            title: 'A post',
            description: 'About a post.',
            authors: ['materwelonDhruv'],
            created: '2026-10-19',
            unlisted: false,
            getText: () => Promise.resolve(''),
            ...images
        }
    };
    return new Post(page as unknown as BlogPost).summary();
}

describe('Post summary thumbnail', () => {
    it('uses the thumbnail when the post sets one', async () => {
        const post = await summaryOf({ cover: COVER, thumbnail: THUMBNAIL });

        expect(post.thumbnail).toEqual(THUMBNAIL);
    });

    it('falls back to the cover', async () => {
        const post = await summaryOf({ cover: COVER });

        expect(post.thumbnail).toEqual(COVER);
    });
});
