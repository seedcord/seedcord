import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { StoredItems, useStoredItem } from '#src/lib/useStoredItem';

function blockedStorage(): Storage {
    throw new DOMException('The operation is insecure.', 'SecurityError');
}

afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
});

describe('useStoredItem', () => {
    it('re-renders with a value written after mount', () => {
        const items = new StoredItems(() => globalThis.sessionStorage);
        const { result } = renderHook(() => useStoredItem(items, 'theme'));

        act(() => {
            items.write('theme', 'dark');
        });

        expect(result.current).toBe('dark');
    });

    it('keeps a value that the browser refused to store until the page reloads', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        });
        const items = new StoredItems(() => globalThis.sessionStorage);
        const { result } = renderHook(() => useStoredItem(items, 'theme'));

        act(() => {
            items.write('theme', 'dark');
        });

        expect(result.current).toBe('dark');
    });

    it('reads null when the browser blocks storage', () => {
        const items = new StoredItems(blockedStorage);
        const { result } = renderHook(() => useStoredItem(items, 'theme'));

        expect(result.current).toBeNull();
    });
});
