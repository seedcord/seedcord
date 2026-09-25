import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PackageCatalogEntry } from '#lib/docs/types';

const GATEWAY: PackageCatalogEntry = {
    id: 'gateway',
    manifestName: '@seedcord/gateway',
    label: 'gateway',
    description: 'Gateway transport for seedcord bots.',
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

vi.mock('#lib/docs/engine', () => ({ getDocsEngine: () => Promise.resolve({}) }));
vi.mock('#lib/docs/catalog', async (importOriginal) => ({
    ...(await importOriginal<typeof import('#lib/docs/catalog')>()),
    loadDocsCatalog: () => Promise.resolve([GATEWAY])
}));

const { default: DocsIndexPage } = await import('#src/app/(docs)/page');

describe('docs index page', () => {
    it('links each package at its latest url', async () => {
        render(await DocsIndexPage());

        expect(screen.getByRole('link', { name: /@seedcord\/gateway/ })).toHaveAttribute(
            'href',
            '/packages/gateway/latest'
        );
    });
});
