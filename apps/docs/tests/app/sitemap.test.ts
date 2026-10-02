import { describe, expect, it, vi } from 'vitest';

import type { NavigationEntityItem, PackageCatalogEntry } from '#lib/docs/types';

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

// AnyHandlerCtor is a forgotten type. the sidebar leaves it out and signatures link to it
const PAGES: NavigationEntityItem[] = [
    { id: 'gated', label: 'Gated', href: '/packages/gateway/0.7.1/functions/gated' },
    { id: 'any-handler-ctor', label: 'AnyHandlerCtor', href: '/packages/gateway/0.7.1/types/any-handler-ctor' },
    { id: 'notice', label: 'Notice', href: '/packages/core/0.9.1/classes/notice' }
];

vi.mock('#lib/docs/engine', () => ({ getDocsEngine: () => Promise.resolve({}) }));
vi.mock('#lib/docs/catalog', async (importOriginal) => ({
    ...(await importOriginal<typeof import('#lib/docs/catalog')>()),
    loadDocsCatalog: () => Promise.resolve([GATEWAY])
}));
vi.mock('#lib/docs/ActiveVersion', () => ({
    ActiveVersion: { open: () => Promise.resolve({ pages: PAGES }) }
}));

const { default: sitemap } = await import('#src/app/sitemap');

describe('sitemap', () => {
    it('lists each package page at its latest url and leaves re-exports to their own package', async () => {
        const urls = (await sitemap()).map((entry) => entry.url);

        expect(urls).toEqual([
            'https://seedcord.org/docs',
            'https://seedcord.org/docs/packages/gateway/latest',
            'https://seedcord.org/docs/packages/gateway/latest/functions/gated',
            'https://seedcord.org/docs/packages/gateway/latest/types/any-handler-ctor'
        ]);
    });
});
