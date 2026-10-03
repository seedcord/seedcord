import { describe, expect, it } from 'vitest';

import { docsFrontPreview, packagePreview, symbolPreview } from '#lib/docs/linkPreview';

import type { ResolvedEntity } from '#lib/docs/resolveEntity';
import type { NavigationCategory, PackageCatalogEntry, PackageVersionCatalog } from '#lib/docs/types';
import type { EntityTone } from '@seedcord/docs-engine/client';

// justified: the builders read id, label and isLatest off a version
const LATEST = { id: '0.9.2', label: 'v0.9.2', isLatest: true } as PackageVersionCatalog;
const OLD = { id: '0.8.0', label: 'v0.8.0', isLatest: false } as PackageVersionCatalog;

// justified: the builders read only these catalog fields
const ENTRY = {
    id: 'core',
    manifestName: '@seedcord/core',
    description: 'Foundational code shared by both transports.',
    symbolCounts: new Map<EntityTone, number>([
        ['class', 2],
        ['function', 3]
    ]),
    versions: [LATEST, OLD]
} as unknown as PackageCatalogEntry;

const list = (count: number): object[] => Array.from({ length: count }, () => ({}));

function resolved(entity: Record<string, unknown>, version = LATEST): ResolvedEntity {
    // justified: symbolPreview reads the entity through entityCard and these fields
    return {
        entry: ENTRY,
        version,
        entity: { name: 'Thing', displayPackage: 'core', manifestPackage: '@seedcord/core', summary: [], ...entity },
        segments: ['classes', 'thing']
    } as unknown as ResolvedEntity;
}

const categories = (counts: [EntityTone, number][]): NavigationCategory[] =>
    // justified: kindRows reads tone and items.length
    counts.map(([tone, count]) => ({ tone, items: list(count) })) as unknown as NavigationCategory[];

describe('symbolPreview', () => {
    it('counts the members of a class and leaves out the empty groups', () => {
        const card = symbolPreview(
            resolved({ kind: 'class', constructors: list(1), properties: list(3), methods: list(0) }),
            undefined
        );

        expect(card.subtext).toEqual(['class', '1 constructor', '3 properties']);
    });

    it('counts the overloads of a function with more than one signature', () => {
        const card = symbolPreview(
            resolved({ kind: 'function', signatures: [{ parameters: [] }, { parameters: [] }] }),
            undefined
        );

        expect(card.subtext).toEqual(['function', '2 overloads']);
    });

    it('counts the parameters of a function with one signature', () => {
        const card = symbolPreview(resolved({ kind: 'function', signatures: [{ parameters: list(1) }] }), undefined);

        expect(card.subtext).toEqual(['function', '1 parameter']);
    });

    it('counts the members of an enum', () => {
        expect(symbolPreview(resolved({ kind: 'enum', members: list(3) }), undefined).subtext).toEqual([
            'enum',
            '3 members'
        ]);
    });

    it('shows only the kind for a type', () => {
        expect(symbolPreview(resolved({ kind: 'type' }), undefined).subtext).toEqual(['type']);
    });

    it('links an old version to the same symbol on the latest version', () => {
        const card = symbolPreview(resolved({ kind: 'type' }, OLD), '/packages/core/latest/types/thing');

        expect(card.latestVersion).toEqual({
            label: 'v0.9.2',
            url: 'https://seedcord.org/docs/packages/core/latest/types/thing'
        });
        expect(card.breadcrumb).toEqual(['docs', '@seedcord/core', 'v0.8.0']);
    });

    it('links an old version to the latest package page when the latest version has no such symbol', () => {
        const card = symbolPreview(resolved({ kind: 'type' }, OLD), undefined);

        expect(card.latestVersion?.url).toBe('https://seedcord.org/docs/packages/core/latest');
    });

    it('leaves the latest link off the latest version', () => {
        expect(symbolPreview(resolved({ kind: 'type' }), undefined).latestVersion).toBeUndefined();
    });

    it('leaves out the source link for a symbol with no source', () => {
        const labels = symbolPreview(resolved({ kind: 'type' }), undefined).links.map(({ label }) => label);

        expect(labels).toEqual(['Markdown']);
    });
});

describe('packagePreview', () => {
    const source = 'https://github.com/seedcord/seedcord/tree/next/packages/core';

    it('puts three kinds on each row and counts one in the singular', () => {
        const card = packagePreview({
            entry: ENTRY,
            version: LATEST,
            versionCategories: categories([
                ['class', 1],
                ['interface', 2],
                ['type', 3],
                ['function', 4]
            ]),
            folderUrl: source
        });

        const rows = card.extraText?.split('\n').map((row) => row.replace(/<:\w+:\d+> /g, ''));
        expect(rows).toEqual(['1 class  2 interfaces  3 types', '4 functions']);
    });

    it('links npm, the source, and the markdown copy on the latest version', () => {
        const card = packagePreview({ entry: ENTRY, version: LATEST, versionCategories: [], folderUrl: source });

        expect(card.links.map(({ url }) => url)).toEqual([
            'https://www.npmjs.com/package/@seedcord/core',
            source,
            'https://seedcord.org/docs/packages/core/0.9.2.md'
        ]);
        expect(card.breadcrumb).toEqual(['docs', 'packages']);
    });

    it('gives an old version its npm page, its version, and the latest link in place of markdown', () => {
        const card = packagePreview({ entry: ENTRY, version: OLD, versionCategories: [], folderUrl: source });

        expect(card.links.map(({ url }) => url)).toEqual([
            'https://www.npmjs.com/package/@seedcord/core/v/0.8.0',
            source
        ]);
        expect(card.breadcrumb).toEqual(['docs', 'packages', 'v0.8.0']);
        expect(card.latestVersion).toEqual({ label: 'v0.9.2', url: 'https://seedcord.org/docs/packages/core/latest' });
    });
});

describe('docsFrontPreview', () => {
    it('counts the packages and every symbol across them', () => {
        expect(docsFrontPreview([ENTRY]).subtext).toEqual(['1 package', '5 symbols']);
    });
});
