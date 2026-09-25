import { describe, expect, it } from 'vitest';

import { GET } from '#src/app/robots.txt/route';

async function body(): Promise<string> {
    return GET().text();
}

describe('the robots file', () => {
    it('points at the sitemap', async () => {
        expect(await body()).toContain('Sitemap: https://guide.seedcord.org/sitemap.xml');
    });
});
