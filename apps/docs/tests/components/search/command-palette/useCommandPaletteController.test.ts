import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SearchPackage } from '#lib/search/types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/docs' }));

const PACKAGES: SearchPackage[] = [
    { id: 'core', label: 'core', fullName: '@seedcord/core', stable: '0.9.2', prerelease: '1.0.0-next.1' }
];

// searchFiles keeps each download for the life of the module
async function freshController(): Promise<
    typeof import('#components/search/command-palette/useCommandPaletteController')
> {
    vi.resetModules();
    return import('#components/search/command-palette/useCommandPaletteController');
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

    it('offers the pre-release toggle before the palette opens', async () => {
        const { useCommandPaletteController } = await freshController();
        const { result } = renderHook(() => useCommandPaletteController());

        await waitFor(() => expect(result.current.hasPrerelease).toBe(true));
        expect(result.current.packages).toEqual([{ folder: 'core', label: 'core' }]);
    });

    it('loads the packages again on open after the first download failed', async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
        const { useCommandPaletteController } = await freshController();
        const { result } = renderHook(() => useCommandPaletteController());
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

        act(() => result.current.handleOpenChange(true));

        await waitFor(() => expect(result.current.packages).toEqual([{ folder: 'core', label: 'core' }]));
    });
});
