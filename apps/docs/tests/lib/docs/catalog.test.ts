import { describe, expect, it, vi } from 'vitest';

import type { PackageCatalogEntry, PackageVersionCatalog } from '../../../src/lib/docs/types';

// justified: stub transitive imports so the test stays hermetic and dodges the '@lib/*' alias vitest can't resolve without vite-tsconfig-paths.
vi.mock('../../../src/lib/docs/engine', () => ({
    getDocsEngine: () =>
        Promise.resolve({ listPackages: () => [], getPackage: () => null, getPackageDirectory: () => null })
}));
vi.mock('@seedcord/docs-engine', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@seedcord/docs-engine')>()),
    formatVersionLabel: (v: string) => v
}));

const { findCatalogVersion } = await import('../../../src/lib/docs/catalog');

function makeVersion(id: string, manifestVersion = id): PackageVersionCatalog {
    return {
        id,
        label: id,
        summary: `summary ${id}`,
        manifestVersion,
        basePath: `/docs/pkg/${id}`,
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

    it('returns the matching version when versionId is an exact id match', () => {
        const v1 = makeVersion('1.2.3');
        const v2 = makeVersion('2.0.0');
        const entry = makeEntry([v1, v2]);
        expect(findCatalogVersion(entry, '1.2.3')).toBe(v1);
        expect(findCatalogVersion(entry, '2.0.0')).toBe(v2);
    });

    it('returns undefined when the versionId does not match any entry id', () => {
        const entry = makeEntry([makeVersion('1.0.0'), makeVersion('2.0.0')]);
        expect(findCatalogVersion(entry, '9.9.9')).toBeUndefined();
    });

    describe("'latest' lookup uses semver comparison", () => {
        it('picks the highest standard semver across major/minor/patch', () => {
            const v100 = makeVersion('1.0.0');
            const v123 = makeVersion('1.2.3');
            const v200 = makeVersion('2.0.0');
            const entry = makeEntry([v100, v200, v123]);
            expect(findCatalogVersion(entry, 'latest')).toBe(v200);
        });

        it('compares minor versions when majors tie', () => {
            const a = makeVersion('1.2.0');
            const b = makeVersion('1.10.0');
            const entry = makeEntry([a, b]);
            expect(findCatalogVersion(entry, 'latest')).toBe(b);
        });

        it('compares patch versions when major and minor tie', () => {
            const a = makeVersion('1.0.0');
            const b = makeVersion('1.0.5');
            const entry = makeEntry([a, b]);
            expect(findCatalogVersion(entry, 'latest')).toBe(b);
        });

        it("strips a leading 'v' before comparing", () => {
            const v1 = makeVersion('v1.0.0', 'v1.0.0');
            const v2 = makeVersion('v2.0.0', 'v2.0.0');
            const entry = makeEntry([v1, v2]);
            expect(findCatalogVersion(entry, 'latest')).toBe(v2);
        });

        it('treats prerelease suffixes as equal to the base patch (digits-only parse)', () => {
            // justified: parseSemver strips non-digit chars per segment, so '1.2.3-beta.1' collapses to [1,2,3] and ties with '1.2.3'. Tiebreaker is sort stability, which we don't pin here.
            const beta = makeVersion('1.2.3-beta.1');
            const plain = makeVersion('1.2.3');
            const entry = makeEntry([beta, plain]);
            const result = findCatalogVersion(entry, 'latest');
            expect(result).toBeDefined();
            expect([beta, plain]).toContain(result);
        });

        it('still picks the higher base semver when one side has a prerelease tag', () => {
            const beta = makeVersion('1.2.3-beta.1');
            const next = makeVersion('1.3.0');
            const entry = makeEntry([beta, next]);
            expect(findCatalogVersion(entry, 'latest')).toBe(next);
        });

        it('ignores build metadata (+sha) the same way (digits-only parse)', () => {
            const meta = makeVersion('1.2.3+build.7');
            const plain = makeVersion('1.2.4');
            const entry = makeEntry([meta, plain]);
            expect(findCatalogVersion(entry, 'latest')).toBe(plain);
        });

        it('treats invalid / non-numeric input segments as 0', () => {
            const garbage = makeVersion('not.a.version');
            const tiny = makeVersion('0.0.1');
            const entry = makeEntry([garbage, tiny]);
            expect(findCatalogVersion(entry, 'latest')).toBe(tiny);
        });

        it('handles a single-version entry by returning it', () => {
            const only = makeVersion('1.0.0');
            const entry = makeEntry([only]);
            expect(findCatalogVersion(entry, 'latest')).toBe(only);
        });

        it('uses manifestVersion (not id) for the comparison', () => {
            const a: PackageVersionCatalog = { ...makeVersion('old'), manifestVersion: '2.5.0' };
            const b: PackageVersionCatalog = { ...makeVersion('new'), manifestVersion: '1.0.0' };
            const entry = makeEntry([a, b]);
            expect(findCatalogVersion(entry, 'latest')).toBe(a);
        });

        it('does not mutate the original versions array order', () => {
            const v1 = makeVersion('1.0.0');
            const v2 = makeVersion('3.0.0');
            const v3 = makeVersion('2.0.0');
            const versions = [v1, v2, v3];
            const entry = makeEntry(versions);
            findCatalogVersion(entry, 'latest');
            expect(versions).toEqual([v1, v2, v3]);
        });
    });
});
