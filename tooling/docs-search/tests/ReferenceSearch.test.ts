import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { DocKind } from '#src/DocKind';
import { ReferenceSearch } from '#src/ReferenceSearch';

import type { SearchIndexEntry, SearchPackage } from '#src/types';

const packages: SearchPackage[] = [
    { id: 'core', label: 'core', fullName: '@seedcord/core', stable: '1.0.0', prerelease: null },
    { id: 'missing', label: 'missing', fullName: '@seedcord/missing', stable: '1.0.0', prerelease: null }
];
const bus: SearchIndexEntry = {
    name: 'Bus',
    qualifiedName: 'Bus',
    slug: 'bus',
    kind: DocKind.Class,
    packageName: '@seedcord/core',
    packageVersion: '1.0.0',
    tokens: ['bus'],
    action: {
        id: 'core:bus',
        label: 'Bus',
        path: '@seedcord/core',
        href: '/packages/core/1.0.0/classes/bus',
        kind: 'class'
    }
};

afterEach(() => vi.unstubAllGlobals());

describe('ReferenceSearch', () => {
    it('shares downloads across selections and searches available indexes when another is missing', async () => {
        const fetchMock = vi.fn((url: string) => {
            if (url.includes('/missing/')) return Promise.resolve(new Response(null, { status: 404 }));
            return Promise.resolve(Response.json(url.endsWith('/packages.json') ? packages : [bus]));
        });
        vi.stubGlobal('fetch', fetchMock);
        const reference = new ReferenceSearch();

        const [first, second] = await Promise.all([reference.results(), reference.results()]);
        const scoped = await reference.results(null, 'core');

        expect(first.rank('Bus').map(({ slug }) => slug)).toEqual(['bus']);
        expect(second.rank('Bus')).toEqual(first.rank('Bus'));
        expect(scoped.rank('Bus')).toEqual(first.rank('Bus'));
        expect(fetchMock.mock.calls).toEqual([
            ['https://seedcord.org/docs/api/search/packages.json'],
            ['https://seedcord.org/docs/api/search/core/1.0.0.json'],
            ['https://seedcord.org/docs/api/search/missing/1.0.0.json']
        ]);
    });

    it('retries a failed index without downloading the successful catalog again', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(Response.json(packages.slice(0, 1)))
            .mockResolvedValueOnce(new Response(null, { status: 503 }))
            .mockResolvedValueOnce(Response.json([bus]));
        vi.stubGlobal('fetch', fetchMock);
        const reference = new ReferenceSearch('/docs/api/search');

        const failed = await reference.results();
        expect(failed.rank('Bus')).toEqual([]);
        const retried = await reference.results();
        expect(retried.rank('Bus').map(({ action }) => action.label)).toEqual(['Bus']);
        expect(fetchMock.mock.calls).toEqual([
            ['/docs/api/search/packages.json'],
            ['/docs/api/search/core/1.0.0.json'],
            ['/docs/api/search/core/1.0.0.json']
        ]);
    });
});
