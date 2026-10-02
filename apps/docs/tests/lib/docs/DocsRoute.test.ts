import { describe, expect, it, vi } from 'vitest';

import type { NavigationEntityItem, PackageCatalogEntry } from '#lib/docs/types';

const EMBED: PackageCatalogEntry = {
    id: 'discord-component-embed',
    manifestName: 'discord-component-embed',
    label: 'discord-component-embed',
    description: '',
    workspace: 'packages',
    symbolCounts: new Map(),
    versions: [
        {
            id: '0.4.1',
            label: 'v0.4.1',
            basePath: '/packages/discord-component-embed/0.4.1',
            isLatest: false,
            badge: null,
            channel: 'stable',
            categories: []
        }
    ]
};

// JSX.Element is declared inside a namespace. buildEntityHref encodes the slash in its slug
const PAGES: NavigationEntityItem[] = [
    { id: 'jsx/element', label: 'Element', href: '/packages/discord-component-embed/0.4.1/types/jsx%2Felement' }
];

vi.mock('#lib/docs/engine', () => ({ getDocsEngine: () => Promise.resolve({}) }));
vi.mock('#lib/docs/catalog', () => ({ loadDocsCatalog: () => Promise.resolve([EMBED]) }));
vi.mock('#lib/docs/ActiveVersion', () => ({
    ActiveVersion: { open: () => Promise.resolve({ pages: PAGES }) }
}));

const { entityParams } = await import('#lib/docs/DocsRoute');

describe('the entity routes the export renders', () => {
    // next encodes each param once when it writes the file
    it('passes a namespaced slug decoded', async () => {
        expect(await entityParams()).toEqual([
            { packageId: 'discord-component-embed', versionId: '0.4.1', entitySegments: ['types', 'jsx/element'] }
        ]);
    });
});
