import { describe, expect, it } from 'vitest';

import { markdownCopy } from '#tests/mdxPipeline';

const TABLE = '| a | b |\n| --- | --- |\n| 1 | 2 |';

describe("a post's markdown copy", () => {
    it('leaves out MDX comments and keeps what they wrap', async () => {
        const copy = await markdownCopy(
            `{/* prettier-ignore-start */}\n\n${TABLE}\n\n{/* prettier-ignore-end */}\n\nafter`
        );

        expect(copy).not.toContain('prettier-ignore');
        expect(copy).toContain('| a | b |');
        expect(copy).toContain('after');
    });

    it('turns a site path into a full url', async () => {
        expect(await markdownCopy('[the guide](/guide)')).toContain('(https://seedcord.org/guide)');
    });
});
