import { afterEach, describe, expect, it, vi } from 'vitest';

import { canonicalUrl, pageMetadata, shownTitle, sitemapEntries } from '#lib/site';

describe('the canonical url for a path', () => {
    it('keeps the trailing slash the export actually serves', () => {
        expect(canonicalUrl('/tooling')).toBe('https://seedcord.org/guide/tooling/');
    });

    it('leaves a path that already ends in a slash alone', () => {
        expect(canonicalUrl('/tooling/')).toBe('https://seedcord.org/guide/tooling/');
    });

    it('names the root with one slash', () => {
        expect(canonicalUrl('/')).toBe('https://seedcord.org/guide/');
    });

    // a trailing slash 404s sitemap.xml
    it('leaves a path with a file extension alone', () => {
        expect(canonicalUrl('/sitemap.xml')).toBe('https://seedcord.org/guide/sitemap.xml');
    });
});

describe('the metadata a guide page carries', () => {
    const page = {
        title: 'Tooling',
        description: 'Configuring and running your bot.',
        path: '/tooling',
        pill: 'tooling'
    };

    it('points the canonical link at the page itself', () => {
        expect(pageMetadata(page).alternates?.canonical).toBe('https://seedcord.org/guide/tooling/');
    });

    it('points the card at the page url plus .png', () => {
        expect(pageMetadata(page).openGraph?.images).toEqual([
            {
                url: 'https://seedcord.org/guide/tooling.png',
                width: 1200,
                height: 630,
                alt: 'A seedcord card reading Tooling, labelled tooling'
            }
        ]);
    });

    it('points the root card at index.png', () => {
        const root = pageMetadata({ ...page, path: '/' });

        expect(root.openGraph?.images).toEqual([
            {
                url: 'https://seedcord.org/guide/index.png',
                width: 1200,
                height: 630,
                alt: 'A seedcord card reading Tooling, labelled tooling'
            }
        ]);
    });

    it('gives the root a title of its own in place of its sidebar label', () => {
        const root = pageMetadata({ ...page, title: 'Start here', path: '/' });
        const shown = root.openGraph?.title;

        expect(shown).not.toContain('Start here');
        expect(root.title).toEqual({ absolute: shown });
    });

    it('gives the root a longer title than the one on its preview card', () => {
        const cardTitle = shownTitle('/', 'Start here');
        const shown = pageMetadata({ ...page, title: 'Start here', path: '/' }).openGraph?.title;

        expect(shown).toContain(cardTitle);
        expect(shown).not.toBe(cardTitle);
    });

    it('keeps every other page on its own title', () => {
        expect(pageMetadata(page).title).toBe('Tooling');
    });

    it('falls back to the site description when a page carries none', () => {
        const bare = pageMetadata({ title: 'Tooling', path: '/tooling', pill: 'tooling' });

        expect(bare.description).toBe('The guide to building Discord bots with seedcord.');
    });
});

describe('the sitemap', () => {
    const edited = new Date('2026-08-30T12:00:00Z');
    const page = (url: string, path: string) => ({ url, path, data: { lastModified: edited } });

    it('lists every page a crawler can reach', () => {
        const pages = [page('/', 'index.mdx'), page('/commands/options', 'commands/options.mdx')];

        expect(sitemapEntries(pages).map((entry) => entry.url)).toEqual([
            'https://seedcord.org/guide/',
            'https://seedcord.org/guide/commands/options/'
        ]);
    });

    it('dates a page from the last commit that touched it', () => {
        expect(sitemapEntries([page('/tooling', 'tooling/index.mdx')])[0]?.lastModified).toBe(edited);
    });

    it('leaves the date off a page git knows nothing about', () => {
        const undated = { url: '/tooling', path: 'tooling/index.mdx', data: {} };

        expect(sitemapEntries([undated])[0]).not.toHaveProperty('lastModified');
    });

    it('ranks the page a reader lands on above every other', () => {
        expect(sitemapEntries([page('/', 'index.mdx')])[0]?.priority).toBe(1);
    });

    it('ranks a tab index above the pages inside it', () => {
        const [index, inner] = sitemapEntries([
            page('/commands', 'commands/index.mdx'),
            page('/commands/options', 'commands/options.mdx')
        ]);

        expect(index?.priority).toBe(0.8);
        expect(inner?.priority).toBe(0.6);
    });

    it('ranks a Start page beside the other tab indexes', () => {
        expect(sitemapEntries([page('/first-bot', 'first-bot.mdx')])[0]?.priority).toBe(0.8);
    });
});

describe('the reference links in development', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('points at the docs dev server under its base path', async () => {
        vi.stubEnv('NODE_ENV', 'development');
        vi.resetModules();

        const { DOCS_URL } = await import('#lib/site');

        expect(DOCS_URL).toBe('http://localhost:3001/docs');
    });
});
