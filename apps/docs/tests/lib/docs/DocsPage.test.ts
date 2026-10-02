import { describe, expect, it } from 'vitest';

import { DocsPage } from '#lib/docs/DocsPage';

import type { EntityModel, PackageCatalogEntry, PackageVersionCatalog } from '#lib/docs/types';
import type { Metadata } from 'next';

// only the fields DocsPage reads
const ENTRY = {
    id: 'core',
    label: 'core',
    manifestName: '@seedcord/core',
    description: 'Core.'
} as PackageCatalogEntry;
const VERSION = { id: '0.9.2', label: 'v0.9.2' } as PackageVersionCatalog;
const ENTITY = {
    kind: 'class',
    name: 'BaseHandler',
    displayPackage: 'core',
    manifestPackage: '@seedcord/core',
    summary: []
} as unknown as EntityModel;

function imageOf(metadata: Metadata): string {
    const [image] = [metadata.openGraph?.images ?? []].flat();
    return typeof image === 'object' && 'url' in image ? String(image.url) : String(image);
}

describe('DocsPage card urls', () => {
    it('points the root at index.png', () => {
        expect(imageOf(DocsPage.root().metadata())).toMatch(/\/index\.png$/);
    });

    it('points a versioned package page at the latest card', () => {
        expect(imageOf(DocsPage.forPackage(ENTRY, VERSION).metadata())).toMatch(/\/packages\/core\/latest\.png$/);
    });

    it('points a versioned entity page at the latest card of the same symbol', () => {
        const page = DocsPage.forEntity(
            '/packages/core/0.9.2/classes/base-handler',
            ENTITY,
            VERSION,
            '/packages/core/latest/classes/base-handler'
        );
        expect(imageOf(page.metadata())).toMatch(/\/packages\/core\/latest\/classes\/base-handler\.png$/);
    });

    it('falls back to the package card when latest dropped the symbol', () => {
        const page = DocsPage.forEntity('/packages/core/0.9.2/classes/base-handler', ENTITY, VERSION, undefined);
        expect(imageOf(page.metadata())).toMatch(/\/packages\/core\/latest\.png$/);
    });
});
