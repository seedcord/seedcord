import { DocKind } from '@seedcord/docs-engine/client';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { useCommandPaletteSearch as UseSearch } from '#components/search/command-palette/useCommandPaletteSearch';
import type { SearchIndexEntry, SearchPackage } from '#lib/search/types';

const router = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => router.pathname }));

const PACKAGES: SearchPackage[] = [
    { id: 'seedcord', label: 'seedcord', fullName: 'seedcord', stable: '1.0.0', prerelease: null },
    { id: 'utils', label: 'utils', fullName: '@seedcord/utils', stable: '2.0.0', prerelease: null }
];

function entry(name: string, packageName: string): SearchIndexEntry {
    const slug = name.toLowerCase();
    return {
        slug,
        name,
        qualifiedName: name,
        packageName,
        kind: DocKind.Class,
        tokens: [slug],
        action: { id: `${packageName}:${slug}`, label: name, path: packageName, href: `/${slug}`, kind: 'class' }
    };
}

let files: Record<string, unknown>;
let fetchMock: ReturnType<typeof vi.fn>;
let useCommandPaletteSearch: typeof UseSearch;

function render(query: string, open = true): ReturnType<typeof renderHook<ReturnType<typeof UseSearch>, void>> {
    return renderHook(() => useCommandPaletteSearch({ open, query, scope: 'all', kind: 'all', prerelease: false }));
}

beforeEach(async () => {
    router.pathname = '/';
    files = {
        '/docs/search/packages.json': PACKAGES,
        '/docs/search/seedcord/1.0.0.json': [entry('Seedcord', 'seedcord')],
        '/docs/search/utils/2.0.0.json': [entry('Clamp', '@seedcord/utils')],
        '/docs/search/utils/1.2.0.json': [entry('Clamp', '@seedcord/utils'), entry('Lerp', '@seedcord/utils')]
    };
    fetchMock = vi.fn((url: string) => {
        const body = files[url];
        return Promise.resolve(
            body === undefined ? new Response(null, { status: 404 }) : new Response(JSON.stringify(body))
        );
    });
    vi.stubGlobal('fetch', fetchMock);

    // searchFiles keeps its downloads for the life of the module
    vi.resetModules();
    ({ useCommandPaletteSearch } = await import('#components/search/command-palette/useCommandPaletteSearch'));
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('useCommandPaletteSearch', () => {
    it('downloads nothing while the palette is closed', () => {
        render('seedcord', false);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('stays idle while the query is shorter than the minimum', async () => {
        const { result } = render('s');
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        expect(result.current).toEqual({ results: [], status: 'idle' });
    });

    it('shows loading until the index arrives, then the ranked results', async () => {
        const { result } = render('clamp');
        expect(result.current.status).toBe('loading');

        await waitFor(() => expect(result.current.status).toBe('success'));
        expect(result.current.results.map((action) => action.label)).toEqual(['Clamp']);
    });

    it('searches the viewed package at the version in the url', async () => {
        router.pathname = '/packages/utils/1.2.0/functions/clamp';
        const { result } = render('lerp');

        await waitFor(() => expect(result.current.status).toBe('success'));
        expect(result.current.results.map((action) => action.label)).toEqual(['Lerp']);
    });

    it('still searches the other packages when one file is missing', async () => {
        delete files['/docs/search/utils/2.0.0.json'];
        const { result } = render('seedcord');

        await waitFor(() => expect(result.current.status).toBe('success'));
        expect(result.current.results.map((action) => action.label)).toEqual(['Seedcord']);
    });

    it('reports an error when the package list does not load', async () => {
        delete files['/docs/search/packages.json'];
        const { result } = render('clamp');

        await waitFor(() => expect(result.current.status).toBe('error'));
        expect(result.current.error).toContain('404');
    });

    it('loads again when the palette reopens after a failed load', async () => {
        const packages = files['/docs/search/packages.json'];
        delete files['/docs/search/packages.json'];
        const { result, rerender } = renderHook(
            ({ open }: { open: boolean }) =>
                useCommandPaletteSearch({ open, query: 'clamp', scope: 'all', kind: 'all', prerelease: false }),
            { initialProps: { open: true } }
        );
        await waitFor(() => expect(result.current.status).toBe('error'));

        files['/docs/search/packages.json'] = packages;
        rerender({ open: false });
        rerender({ open: true });

        await waitFor(() => expect(result.current.status).toBe('success'));
        expect(result.current.results.map((action) => action.label)).toEqual(['Clamp']);
    });

    it('downloads each file once across queries', async () => {
        const { result, rerender } = renderHook(
            ({ query }: { query: string }) =>
                useCommandPaletteSearch({ open: true, query, scope: 'all', kind: 'all', prerelease: false }),
            { initialProps: { query: 'clamp' } }
        );
        await waitFor(() => expect(result.current.status).toBe('success'));

        rerender({ query: 'seedcord' });
        expect(result.current.results.map((action) => action.label)).toEqual(['Seedcord']);
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });
});
