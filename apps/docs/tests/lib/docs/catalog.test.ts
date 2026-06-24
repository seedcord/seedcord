import { describe, expect, it, vi } from 'vitest';

import type { NavigationCategory, PackageCatalogEntry, PackageVersionCatalog } from '@lib/docs/types';
import type { PackageIndexEntry } from '@seedcord/docs-engine';

const { engineStub } = vi.hoisted(() => ({
    engineStub: {
        ready: vi.fn<() => Promise<void>>(),
        listPackages: vi.fn<() => Promise<{ folder: string; fullName: string }[]>>(),
        getEntry: vi.fn<(folder: string) => Promise<PackageIndexEntry | null>>()
    }
}));

// justified: stub transitive imports so the test stays hermetic and dodges the '@lib/*' alias vitest can't resolve without vite-tsconfig-paths.
vi.mock('../../../src/lib/docs/engine', () => ({
    getDocsEngine: () => Promise.resolve(engineStub)
}));
vi.mock('@seedcord/docs-engine', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@seedcord/docs-engine')>()),
    formatVersionLabel: (v: string) => v
}));

const { findCatalogVersion, loadDocsCatalog, withActiveCategories } = await import('@lib/docs/catalog');

function makeVersion(
    id: string,
    opts: { isLatest?: boolean; channel?: 'stable' | 'prerelease'; badge?: PackageVersionCatalog['badge'] } = {}
): PackageVersionCatalog {
    return {
        id,
        label: id,
        basePath: `/pkg/${id}`,
        isLatest: opts.isLatest ?? false,
        badge: opts.badge ?? null,
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

describe('loadDocsCatalog version badges', () => {
    it("badges the stable head 'latest' and the prerelease head 'next', keeping the prerelease the default head on a 0-stable package", async () => {
        const prereleaseOnly: PackageIndexEntry = {
            fullName: '@seedcord/cli',
            stable: null,
            prerelease: { latest: '0.11.0-next.0' }
        };
        const stableAndPre: PackageIndexEntry = {
            fullName: '@seedcord/utils',
            stable: { latest: '1.2.0', latestByMinor: { '1.2': '1.2.0' }, latestByMajor: { '1': '1.2.0' } },
            prerelease: { latest: '2.0.0-next.0' }
        };
        const entries: Record<string, PackageIndexEntry> = { cli: prereleaseOnly, utils: stableAndPre };

        engineStub.ready.mockResolvedValue(undefined);
        engineStub.listPackages.mockResolvedValue([
            { folder: 'cli', fullName: '@seedcord/cli' },
            { folder: 'utils', fullName: '@seedcord/utils' }
        ]);
        engineStub.getEntry.mockImplementation((folder) => Promise.resolve(entries[folder] ?? null));

        const catalog = await loadDocsCatalog();
        const cli = catalog.find((entry) => entry.manifestName === '@seedcord/cli');
        const utils = catalog.find((entry) => entry.manifestName === '@seedcord/utils');

        expect(cli?.versions).toHaveLength(1);
        expect(cli?.versions[0]).toMatchObject({
            id: '0.11.0-next.0',
            channel: 'prerelease',
            isLatest: true,
            badge: 'next'
        });

        const stableHead = utils?.versions.find((version) => version.id === '1.2.0');
        const preHead = utils?.versions.find((version) => version.id === '2.0.0-next.0');
        expect(stableHead).toMatchObject({ channel: 'stable', isLatest: true, badge: 'latest' });
        expect(preHead).toMatchObject({ channel: 'prerelease', isLatest: false, badge: 'next' });
    });
});

describe('loadDocsCatalog descriptions', () => {
    it('uses the index description when present and falls back to a generic line otherwise', async () => {
        const stable = { latest: '1.0.0', latestByMinor: { '1.0': '1.0.0' }, latestByMajor: { '1': '1.0.0' } };
        const withDesc: PackageIndexEntry = {
            fullName: '@seedcord/utils',
            stable,
            prerelease: null,
            description: 'Utility helpers for seedcord packages.'
        };
        const noDesc: PackageIndexEntry = { fullName: '@seedcord/cli', stable, prerelease: null };
        const entries: Record<string, PackageIndexEntry> = { utils: withDesc, cli: noDesc };

        engineStub.ready.mockResolvedValue(undefined);
        engineStub.listPackages.mockResolvedValue([
            { folder: 'utils', fullName: '@seedcord/utils' },
            { folder: 'cli', fullName: '@seedcord/cli' }
        ]);
        engineStub.getEntry.mockImplementation((folder) => Promise.resolve(entries[folder] ?? null));

        const catalog = await loadDocsCatalog();
        expect(catalog.find((entry) => entry.manifestName === '@seedcord/utils')?.description).toBe(
            'Utility helpers for seedcord packages.'
        );
        expect(catalog.find((entry) => entry.manifestName === '@seedcord/cli')?.description).toBe(
            'Reference documentation for cli.'
        );
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
