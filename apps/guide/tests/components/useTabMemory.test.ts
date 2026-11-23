import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { useTabMemory } from '#components/useTabMemory';

afterEach(() => {
    sessionStorage.clear();
});

function renderTabMemory(): ReturnType<typeof renderHook<(href: string) => string, { tab: string; path: string }>> {
    return renderHook(({ tab, path }) => useTabMemory(tab, path), {
        initialProps: { tab: '/plugins', path: '/plugins/kysely' }
    });
}

describe('useTabMemory', () => {
    it('links a tab to the last page you opened in it', () => {
        const { result, rerender } = renderTabMemory();

        rerender({ tab: '/checks', path: '/checks/cooldown' });

        expect(result.current('/plugins')).toBe('/plugins/kysely');
        expect(result.current('/checks')).toBe('/checks/cooldown');
    });

    it('links a tab you never opened to its first page', () => {
        const { result } = renderTabMemory();

        expect(result.current('/events')).toBe('/events');
    });

    it('keeps the pages after the shell remounts', () => {
        const { unmount } = renderTabMemory();
        unmount();

        const { result } = renderHook(() => useTabMemory('/checks', '/checks'));

        expect(result.current('/plugins')).toBe('/plugins/kysely');
    });
});
