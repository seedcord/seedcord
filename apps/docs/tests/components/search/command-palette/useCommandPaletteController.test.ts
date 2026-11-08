import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { CommandPaletteController } from '#components/search/command-palette/useCommandPaletteController.ts';
import type { SearchPackage } from '@seedcord/docs-search';
import type { RenderHookResult } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/docs' }));

const PACKAGES: SearchPackage[] = [
    { id: 'core', label: 'core', fullName: '@seedcord/core', stable: '0.9.2', prerelease: '1.0.0-next.1' }
];

// referenceSearch keeps each download for the life of the module
async function freshController(): Promise<() => RenderHookResult<CommandPaletteController, unknown>> {
    vi.resetModules();
    const [{ useCommandPaletteController }, { CommandPaletteProvider }] = await Promise.all([
        import('#components/search/command-palette/useCommandPaletteController'),
        import('#components/providers/CommandPaletteProvider')
    ]);
    return () => renderHook(() => useCommandPaletteController(), { wrapper: CommandPaletteProvider });
}

describe('useCommandPaletteController', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve(Response.json(PACKAGES)))
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('keeps the text and the filters when the palette closes and opens again', async () => {
        const render = await freshController();
        const { result } = render();

        act(() => {
            result.current.handleOpenChange(true);
            result.current.handleValueChange('clamp');
            result.current.handleKindChange('class');
        });
        act(() => result.current.handleOpenChange(false));
        act(() => result.current.handleOpenChange(true));

        expect(result.current).toMatchObject({ open: true, searchValue: 'clamp', kind: 'class' });
    });

    it('offers the pre-release toggle before the palette opens', async () => {
        const render = await freshController();
        const { result } = render();

        await waitFor(() => expect(result.current.hasPrerelease).toBe(true));
        expect(result.current.packages).toEqual([{ folder: 'core', label: 'core' }]);
    });

    it('loads the packages again on open after the first download failed', async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
        const render = await freshController();
        const { result } = render();
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

        act(() => result.current.handleOpenChange(true));

        await waitFor(() => expect(result.current.packages).toEqual([{ folder: 'core', label: 'core' }]));
    });

    it('loads the packages again when the first download fails after the palette opened', async () => {
        const first = Promise.withResolvers<Response>();
        vi.mocked(fetch).mockReturnValueOnce(first.promise);
        const render = await freshController();
        const { result } = render();

        act(() => result.current.handleOpenChange(true));
        await act(() => {
            first.reject(new Error('offline'));
            return first.promise.catch(() => undefined);
        });

        await waitFor(() => expect(result.current.packages).toEqual([{ folder: 'core', label: 'core' }]));
    });

    it('waits for the palette to open before it loads a failed download again', async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
        const render = await freshController();
        render();
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

        await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
