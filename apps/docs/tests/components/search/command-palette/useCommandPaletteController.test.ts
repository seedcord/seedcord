import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCommandPaletteController } from '#components/search/command-palette/useCommandPaletteController';

import type { SearchPackage } from '#lib/search/types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/docs' }));

const PACKAGES: SearchPackage[] = [
    { id: 'core', label: 'core', fullName: '@seedcord/core', stable: '0.9.2', prerelease: '1.0.0-next.1' }
];

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

    it('learns about a live pre-release before the palette opens', async () => {
        const { result } = renderHook(() => useCommandPaletteController());

        await waitFor(() => expect(result.current.hasPrerelease).toBe(true));
        expect(result.current.open).toBe(false);
        expect(result.current.packages).toEqual([{ folder: 'core', label: 'core' }]);
    });
});
