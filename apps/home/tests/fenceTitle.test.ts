import { describe, expect, it } from 'vitest';

import { PostFolder } from './mdxPipeline';

describe('a fence title', () => {
    it('is set on the code element as data-title', async () => {
        using post = new PostFolder();

        const code = await post.compile('```ts title="src/bot.ts"\nconst a = 1;\n```');

        expect(code).toContain('data-title="src/bot.ts"');
    });
});
