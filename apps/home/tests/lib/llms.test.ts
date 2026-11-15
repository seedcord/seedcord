import { describe, expect, it } from 'vite-plus/test';

import { llmsText } from '#lib/llms';
import { POST } from '#tests/fixtures/post';

describe('llmsText', () => {
    it('lists each post under a Blog heading', () => {
        expect(llmsText([POST])).toContain(
            `## Blog\n\n- [${POST.title}](https://seedcord.org/blog/${POST.slug}/index.md): ${POST.description}`
        );
    });

    it('hides the Blog heading until a post is listed', () => {
        expect(llmsText([])).not.toContain('## Blog');
    });
});
