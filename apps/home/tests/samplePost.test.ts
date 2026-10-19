import { readFileSync } from 'node:fs';
import path from 'node:path';

import { frontmatter } from 'fumadocs-core/content/md/frontmatter';
import { describe, expect, it } from 'vitest';

import { postSchema } from '#lib/blog/frontmatter';

import { compilePost } from './mdxPipeline';

const SAMPLE = path.join(import.meta.dirname, '../content/blog/sample/index.mdx');
const { data, content } = frontmatter(readFileSync(SAMPLE, 'utf8'));

describe('the sample post contributors copy', () => {
    it('passes the frontmatter rules and stays unlisted', () => {
        const parsed = postSchema({ path: SAMPLE, source: '' }).safeParse(data);

        expect(parsed.error).toBeUndefined();
        expect(parsed.data?.unlisted).toBe(true);
    });

    it('compiles through the blog pipeline', async () => {
        await expect(compilePost(content, SAMPLE)).resolves.toContain('_components.h2');
    });
});
