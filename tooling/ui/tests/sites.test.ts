import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SiteAddress } from '#src/sites';

describe('the three sites', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('sit on the production origin by default', async () => {
        const { HOME_URL, GUIDE_URL, DOCS_URL } = await import('#src/sites');

        expect([HOME_URL, GUIDE_URL, DOCS_URL]).toEqual([
            'https://seedcord.org',
            'https://seedcord.org/guide',
            'https://seedcord.org/docs'
        ]);
    });

    it('move home and the guide to NEXT_PUBLIC_SITE_ORIGIN, and docs and the chat link stay on production', async () => {
        vi.stubEnv('NEXT_PUBLIC_SITE_ORIGIN', 'https://preview.seedcord.org');

        const { HOME_URL, GUIDE_URL, DOCS_URL, DISCORD_URL, IS_PRODUCTION } = await import('#src/sites');

        expect(IS_PRODUCTION).toBe(false);
        expect([HOME_URL, GUIDE_URL, DOCS_URL, DISCORD_URL]).toEqual([
            'https://preview.seedcord.org',
            'https://preview.seedcord.org/guide',
            'https://seedcord.org/docs',
            'https://seedcord.org/chat/'
        ]);
    });
});

describe('SiteAddress', () => {
    const guide = new SiteAddress('https://seedcord.org/guide');

    it('keeps the base path when it joins a path', () => {
        expect(guide.at('/tooling/')).toBe('https://seedcord.org/guide/tooling/');
    });

    it('answers the site root with one trailing slash', () => {
        expect(guide.at('/')).toBe('https://seedcord.org/guide/');
    });

    it('answers an empty path with the base url itself', () => {
        expect(guide.at('')).toBe('https://seedcord.org/guide');
    });

    it('joins a path written without a leading slash', () => {
        expect(guide.at('sitemap.xml')).toBe('https://seedcord.org/guide/sitemap.xml');
    });

    it('joins onto a site with no base path', () => {
        expect(new SiteAddress('https://seedcord.org').at('/sitemap.xml')).toBe('https://seedcord.org/sitemap.xml');
    });

    it('reads a base url given with a trailing slash the same as one without', () => {
        const slashed = new SiteAddress('https://preview.example.dev/docs/');

        expect(slashed.url).toBe('https://preview.example.dev/docs');
        expect(slashed.at('/packages')).toBe('https://preview.example.dev/docs/packages');
    });

    it('leaves the protocol off its label', () => {
        expect(guide.label).toBe('seedcord.org/guide');
        expect(new SiteAddress('http://localhost:3001/docs').label).toBe('localhost:3001/docs');
    });

    it('gives its base path, empty at the origin root', () => {
        expect(guide.path).toBe('/guide');
        expect(new SiteAddress('https://seedcord.org').path).toBe('');
    });
});
