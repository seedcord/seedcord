import { describe, expect, it } from 'vitest';

import { linkKind } from '#lib/links';

describe('linkKind', () => {
    it('treats a page of this app as a page', () => {
        expect(linkKind('/blog/')).toBe('page');
    });

    // home has no basePath, so next/link would route these as pages of this app
    it.each(['/guide/start', '/docs', '/blog/rss.xml', 'https://seedcord.org/guide'])(
        'treats %s as another part of the site',
        (href) => {
            expect(linkKind(href)).toBe('site');
        }
    );

    it.each(['https://github.com/seedcord/seedcord', 'https://discord.gg/DzFxY58WXf'])(
        'treats %s as external',
        (href) => {
            expect(linkKind(href)).toBe('external');
        }
    );
});
