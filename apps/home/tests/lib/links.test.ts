import { describe, expect, it } from 'vitest';

import { linkKind } from '#lib/links';

describe('linkKind', () => {
    it.each(['/blog/', '/blog/sample/#a-heading'])('treats %s as a home page', (href) => {
        expect(linkKind(href)).toBe('home-page');
    });

    // home has no basePath, so next/link would route these as pages of this app
    it.each(['/guide/start', '/docs', '/blog/rss.xml', '/blog/rss.xml?v=2', 'https://seedcord.org/guide'])(
        'treats %s as another part of the site',
        (href) => {
            expect(linkKind(href)).toBe('same-site');
        }
    );

    it.each(['https://github.com/seedcord/seedcord', 'https://discord.gg/DzFxY58WXf'])(
        'treats %s as external',
        (href) => {
            expect(linkKind(href)).toBe('external');
        }
    );
});
