import { describe, expect, it } from 'vitest';

import { GET } from '#src/app/robots.txt/route';

async function body(): Promise<string> {
    return GET().text();
}

describe('the robots file', () => {
    it('serves as plain text', () => {
        expect(GET().headers.get('content-type')).toBe('text/plain; charset=utf-8');
    });

    it('lets a crawler read every page', async () => {
        expect(await body()).toContain('Allow: /');
    });

    it('keeps the dev routes out', async () => {
        expect(await body()).toContain('Disallow: /dev');
    });

    it('points at the sitemap', async () => {
        expect(await body()).toContain('Sitemap: https://guide.seedcord.org/sitemap.xml');
    });

    it('answers the content signals policy the reference site already answers', async () => {
        expect(await body()).toContain('Content-Signal: search=yes, ai-train=yes, ai-input=yes');
    });
});
