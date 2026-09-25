import { describe, expect, it, vi } from 'vitest';

import type { NavigationCategory, PackageCatalogEntry } from '#lib/docs/types';

const GATEWAY: PackageCatalogEntry = {
    id: 'gateway',
    manifestName: '@seedcord/gateway',
    label: 'gateway',
    description: '',
    workspace: 'packages',
    symbolCounts: new Map(),
    versions: [
        {
            id: '0.7.1',
            label: 'v0.7.1',
            basePath: '/packages/gateway/0.7.1',
            isLatest: true,
            badge: 'latest',
            channel: 'stable',
            categories: []
        }
    ]
};

const CATEGORIES: NavigationCategory[] = [
    {
        id: 'functions',
        title: 'Functions',
        tone: 'function',
        items: [
            { id: 'gated', label: 'Gated', href: '/packages/gateway/0.7.1/functions/gated' },
            { id: 'notice', label: 'Notice', href: '/packages/core/0.9.1/classes/notice' }
        ]
    }
];

vi.mock('#lib/docs/engine', () => ({ getDocsEngine: () => Promise.resolve({}) }));
vi.mock('#lib/docs/catalog', async (importOriginal) => ({
    ...(await importOriginal<typeof import('#lib/docs/catalog')>()),
    loadDocsCatalog: () => Promise.resolve([GATEWAY]),
    collectCategories: () => Promise.resolve(CATEGORIES)
}));

const { default: sitemap } = await import('#src/app/sitemap');

describe('sitemap', () => {
    it('lists each package page at its latest url and leaves re-exports to their own package', async () => {
        const urls = (await sitemap()).map((entry) => entry.url);

        expect(urls).toEqual([
            'https://docs.seedcord.org/',
            'https://docs.seedcord.org/packages/gateway/latest',
            'https://docs.seedcord.org/packages/gateway/latest/functions/gated'
        ]);
    });
});
