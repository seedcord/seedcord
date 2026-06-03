import { describe, expect, it, vi } from 'vitest';

import type { NavigationCategory, PackageCatalogEntry, PackageVersionCatalog } from '@lib/docs/types';

// justified: stub transitive imports so the test stays hermetic and dodges the '@lib/*' alias vitest can't resolve without vite-tsconfig-paths.
vi.mock('../../../src/lib/docs/engine', () => ({
    getDocsEngine: () => Promise.resolve({})
}));
vi.mock('@seedcord/docs-engine', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@seedcord/docs-engine')>()),
    formatVersionLabel: (v: string) => v
}));

const { findCatalogVersion, withActiveCategories } = await import('@lib/docs/catalog');

function makeVersion(
    id: string,
    opts: { isLatest?: boolean; channel?: 'stable' | 'prerelease' } = {}
): PackageVersionCatalog {
    return {
        id,
        label: id,
        basePath: `/pkg/${id}`,
        isLatest: opts.isLatest ?? false,
        channel: opts.channel ?? 'stable',
        categories: []
    };
}

function makeEntry(versions: PackageVersionCatalog[]): PackageCatalogEntry {
    return {
        id: 'seedcord',
        manifestName: 'seedcord',
        label: 'seedcord',
        description: 'desc',
        versions
    };
}

describe('findCatalogVersion', () => {
    it('returns undefined when the entry has no versions', () => {
        const entry = makeEntry([]);
        expect(findCatalogVersion(entry, 'latest')).toBeUndefined();
        expect(findCatalogVersion(entry, '1.0.0')).toBeUndefined();
    });

    it('returns the matching version for an exact id', () => {
        const v1 = makeVersion('1.2.3');
        const v2 = makeVersion('2.0.0');
        const entry = makeEntry([v1, v2]);
        expect(findCatalogVersion(entry, '1.2.3')).toBe(v1);
        expect(findCatalogVersion(entry, '2.0.0')).toBe(v2);
    });

    it('returns undefined when the id matches nothing', () => {
        const entry = makeEntry([makeVersion('1.0.0'), makeVersion('2.0.0')]);
        expect(findCatalogVersion(entry, '9.9.9')).toBeUndefined();
    });

    it("resolves 'latest' to the version flagged isLatest", () => {
        const older = makeVersion('1.0.0');
        const newest = makeVersion('2.0.0', { isLatest: true });
        const entry = makeEntry([newest, older]);
        expect(findCatalogVersion(entry, 'latest')).toBe(newest);
    });

    it("falls back to the first version for 'latest' when none is flagged (prerelease-only)", () => {
        const pre = makeVersion('1.0.0-next.1', { channel: 'prerelease' });
        const entry = makeEntry([pre]);
        expect(findCatalogVersion(entry, 'latest')).toBe(pre);
    });
});

describe('withActiveCategories', () => {
    const categories: NavigationCategory[] = [{ id: 'classes', title: 'Classes', tone: 'class', items: [] }];

    it('fills only the resolved (package, version) and leaves the rest empty', () => {
        const catalog = [makeEntry([makeVersion('1.0.0', { isLatest: true }), makeVersion('0.9.0')])];

        const [entry] = withActiveCategories(catalog, 'seedcord', '1.0.0', categories);
        expect(entry?.versions.find((version) => version.id === '1.0.0')?.categories).toEqual(categories);
        expect(entry?.versions.find((version) => version.id === '0.9.0')?.categories).toEqual([]);
    });

    it('returns entries unchanged when the package id does not match', () => {
        const catalog = [makeEntry([makeVersion('1.0.0', { isLatest: true })])];
        expect(withActiveCategories(catalog, 'other', '1.0.0', categories)).toEqual(catalog);
    });
});
