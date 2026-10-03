import { describe, expect, it } from 'vitest';

import { SiteAddress } from '#src/sites';

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
