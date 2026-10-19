import { describe, expect, it } from 'vitest';

import { PostFolder } from '#tests/mdxPipeline';

describe('a heading in a post', () => {
    it.each([
        ['# one', 'h1'],
        ['##### five', 'h5']
    ])('fails the build on %s', async (source, depth) => {
        using post = new PostFolder();

        await expect(post.compile(source)).rejects.toThrow(`has an ${depth}. A post can use h2 through h4.`);
    });

    it('compiles h2 through h4', async () => {
        using post = new PostFolder();

        await expect(post.compile('## two\n\n### three\n\n#### four')).resolves.toContain('_components.h4');
    });
});
