import { describe, expect, it, vi } from 'vitest';

import { IndexFetchError } from '@remote/errors';
import { validateIndex } from '@remote/index-json';
import { IndexLoader } from '@remote/index-loader';

import type { IndexJson } from '@remote/index-json';
import type { Fetcher } from '@remote/index-loader';

const INDEX_URL = 'https://cdn.test/gh/seedcord/artifacts@main/index.json';

const fixture: IndexJson = {
    schemaVersion: 1,
    updatedAt: '2026-06-02T00:00:00.000Z',
    pathTemplates: {
        stable: 'packages/{name}/releases/{version}/project.json',
        prerelease: 'packages/{name}/prerelease/{version}/project.json'
    },
    packages: {
        utils: {
            fullName: '@seedcord/utils',
            stable: {
                latest: '1.3.2',
                latestByMinor: { '0.2': '0.2.4' },
                latestByMajor: { '0': '0.2.4', '1': '1.3.2' }
            },
            prerelease: { latest: '2.0.0-alpha.1' }
        }
    }
};

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status });
}

function okFetcher(body: unknown): Fetcher {
    return vi.fn(() => Promise.resolve(jsonResponse(body)));
}

describe('IndexLoader', () => {
    it('caches by default and re-fetches with force', async () => {
        const fetcher = okFetcher(fixture);
        const loader = new IndexLoader(INDEX_URL, fetcher);

        await loader.load();
        await loader.load();
        expect(fetcher).toHaveBeenCalledTimes(1);

        await loader.load(true);
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('throws IndexFetchError on a non-ok response', async () => {
        const loader = new IndexLoader(INDEX_URL, () => Promise.resolve(new Response('nope', { status: 503 })));
        await expect(loader.load()).rejects.toBeInstanceOf(IndexFetchError);
    });

    it('throws IndexFetchError on a schema violation', async () => {
        const loader = new IndexLoader(INDEX_URL, okFetcher({ schemaVersion: 2 }));
        await expect(loader.load()).rejects.toBeInstanceOf(IndexFetchError);
    });

    describe('resolveVersion', () => {
        const entry = fixture.packages.utils!;
        const loader = new IndexLoader(INDEX_URL, okFetcher(fixture));

        it('resolves latest and prerelease channel heads', () => {
            expect(loader.resolveVersion(entry, 'latest')).toEqual({ version: '1.3.2', channel: 'stable' });
            expect(loader.resolveVersion(entry, 'prerelease')).toEqual({
                version: '2.0.0-alpha.1',
                channel: 'prerelease'
            });
        });

        it('resolves major (vN) and minor (0.x) lines', () => {
            expect(loader.resolveVersion(entry, 'v1')).toEqual({ version: '1.3.2', channel: 'stable' });
            expect(loader.resolveVersion(entry, '1')).toEqual({ version: '1.3.2', channel: 'stable' });
            expect(loader.resolveVersion(entry, '0.2')).toEqual({ version: '0.2.4', channel: 'stable' });
        });

        it('passes through a published line head and rejects unknowns', () => {
            expect(loader.resolveVersion(entry, '1.3.2')).toEqual({ version: '1.3.2', channel: 'stable' });
            expect(loader.resolveVersion(entry, '9.9.9')).toBeNull();
        });

        it('resolves a concrete prerelease head by its version string', () => {
            expect(loader.resolveVersion(entry, '2.0.0-alpha.1')).toEqual({
                version: '2.0.0-alpha.1',
                channel: 'prerelease'
            });
        });
    });

    it('builds project URLs from the path templates relative to the index base', () => {
        const loader = new IndexLoader(INDEX_URL, okFetcher(fixture));

        expect(loader.buildProjectUrl(fixture, 'utils', '1.3.2', 'stable')).toBe(
            'https://cdn.test/gh/seedcord/artifacts@main/packages/utils/releases/1.3.2/project.json'
        );
        expect(loader.buildProjectUrl(fixture, 'utils', '2.0.0-alpha.1', 'prerelease')).toBe(
            'https://cdn.test/gh/seedcord/artifacts@main/packages/utils/prerelease/2.0.0-alpha.1/project.json'
        );
    });

    it('validateIndex round-trips a known-good index', () => {
        expect(validateIndex(JSON.parse(JSON.stringify(fixture)))).toEqual(fixture);
    });
});
