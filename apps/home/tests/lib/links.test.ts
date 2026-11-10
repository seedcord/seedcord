import { describe, expect, it } from 'vite-plus/test';

import { linkKind } from '#lib/links';

describe('linkKind', () => {
    it.each(['/blog/', '/blog/sample/#a-heading'])('treats %s as a home page', (href) => {
        expect(linkKind(href)).toBe('home-page');
    });

    // home doesn't set a basePath, so next/link would route these as pages of this app
    it.each(['/guide/start', '/docs', '/blog/rss.xml', '/blog/rss.xml?v=2', 'https://seedcord.org/guide'])(
        'treats %s as another part of the site',
        (href) => {
            expect(linkKind(href)).toBe('same-site');
        }
    );

    it.each([
        'https://github.com/seedcord/seedcord',
        'https://www.npmjs.com/org/seedcord',
        'https://seedcord.org/chat/'
    ])('treats %s as external', (href) => {
        expect(linkKind(href)).toBe('external');
    });
});
