import { DocKind } from '@seedcord/docs-search';
import { describe, expect, it, vi } from 'vite-plus/test';

import { docNode, fixtureEngine } from '#tests/fixtures/docsEngine';

import type { SearchIndexEntry } from '@seedcord/docs-search';

vi.mock('#lib/docs/engine', () => ({
    getDocsEngine: () =>
        Promise.resolve(
            fixtureEngine('core', '@seedcord/core', [
                { version: '0.9.2', nodes: (pkg) => [docNode(pkg, 'Bus', { kind: DocKind.Class })] }
            ])
        )
}));

const { GET } = await import('#src/app/api/search/[packageId]/[file]/route.ts');

function search(packageId: string, file: string): Promise<Response> {
    return GET(new Request('https://seedcord.org/docs/api/search'), { params: Promise.resolve({ packageId, file }) });
}

describe('GET /api/search/[packageId]/[file]', () => {
    it('serves the symbols of the version in the file name', async () => {
        const response = await search('core', '0.9.2.json');
        const entries = (await response.json()) as SearchIndexEntry[];

        expect(entries.map(({ action }) => [action.label, action.href])).toEqual([
            ['Bus', '/packages/core/0.9.2/classes/bus']
        ]);
    });

    it('returns a 404 for a package the index does not list', async () => {
        expect((await search('nope', '0.9.2.json')).status).toBe(404);
    });

    it('returns a 404 for a file without the .json extension', async () => {
        expect((await search('core', '0.9.2')).status).toBe(404);
    });
});
