import { describe, expect, it } from 'vitest';

import { PostFolder } from '#tests/mdxPipeline';

describe('a fence title', () => {
    it('is set on the code element as data-title', async () => {
        using post = new PostFolder();

        const code = await post.compile('```ts title="src/bot.ts"\nconst a = 1;\n```');

        expect(code).toContain('data-title="src/bot.ts"');
    });
});

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
