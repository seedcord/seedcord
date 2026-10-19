import { describe, expect, it } from 'vitest';

import { postSchema } from '#lib/blog/frontmatter';
import { POST_SLUG, PostFolder } from '#tests/mdxPipeline';

const VALID = {
    title: 'Typed customIds',
    description: 'How a customId carries typed fields.',
    authors: ['materwelonDhruv'],
    created: '2026-10-19'
};

type Parsed = ReturnType<ReturnType<typeof postSchema>['safeParse']>;

function parse(data: Record<string, unknown>, file = `/blog/${POST_SLUG}/index.mdx`): Parsed {
    return postSchema({ path: file, source: '' }).safeParse(data);
}

describe('post frontmatter', () => {
    it('rejects an author missing from authors.ts', () => {
        const result = parse({ ...VALID, authors: ['someone'] });

        expect(result.error?.message).toContain('authors.ts');
    });

    it('rejects an edited date before the created date', () => {
        const result = parse({ ...VALID, edited: '2026-10-18' });

        expect(result.error?.message).toContain('edited (2026-10-18) is before created (2026-10-19)');
    });

    it('rejects a cover that is not webp', () => {
        using post = new PostFolder().bytes('cover.png', 10);

        const result = parse({ ...VALID, cover: { src: './cover.png', alt: 'the dev tui' } }, post.file);

        expect(result.error?.message).toContain('cwebp cover.png -o cover.webp');
    });

    it('parses a webp cover into its url and size', () => {
        using post = new PostFolder().webp('cover.webp');

        const result = parse({ ...VALID, cover: { src: './cover.webp', alt: 'the dev tui' } }, post.file);

        expect(result.data?.cover).toEqual({
            src: `/blog/${POST_SLUG}/cover.webp`,
            alt: 'the dev tui',
            width: 4,
            height: 3
        });
    });
});
