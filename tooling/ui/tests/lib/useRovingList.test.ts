import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRovingList } from '#src/lib/useRovingList';

import type { KeyboardEvent } from 'react';

const ITEMS: readonly string[] = ['a', 'b', 'c'];

function keyEvent(key: string): KeyboardEvent<HTMLElement> {
    return { key, preventDefault: vi.fn() } as unknown as KeyboardEvent<HTMLElement>;
}

function press(result: { current: ReturnType<typeof useRovingList> }, ...keys: string[]): void {
    for (const key of keys) act(() => result.current.onKeyDown(keyEvent(key)));
}

describe('useRovingList', () => {
    it('starts on the first item', () => {
        const { result } = renderHook(() => useRovingList({ items: ITEMS, onSelect: vi.fn() }));

        expect(result.current.activeIndex).toBe(0);
        expect(result.current.isFirst).toBe(true);
        expect(result.current.isLast).toBe(false);
    });

    it('stops at the last item instead of wrapping to the first', () => {
        const { result } = renderHook(() => useRovingList({ items: ITEMS, onSelect: vi.fn() }));

        press(result, 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown');

        expect(result.current.activeIndex).toBe(2);
        expect(result.current.isLast).toBe(true);
    });

    it('stops at the first item instead of wrapping to the last', () => {
        const { result } = renderHook(() => useRovingList({ items: ITEMS, onSelect: vi.fn() }));

        press(result, 'ArrowDown', 'ArrowUp', 'ArrowUp');

        expect(result.current.activeIndex).toBe(0);
    });

    it('jumps to either end with Home and End', () => {
        const { result } = renderHook(() => useRovingList({ items: ITEMS, onSelect: vi.fn() }));

        press(result, 'End');
        expect(result.current.activeIndex).toBe(2);

        press(result, 'Home');
        expect(result.current.activeIndex).toBe(0);
    });

    it('selects the active item on Enter', () => {
        const onSelect = vi.fn();
        const { result } = renderHook(() => useRovingList({ items: ITEMS, onSelect }));

        press(result, 'ArrowDown', 'Enter');

        expect(onSelect).toHaveBeenCalledExactlyOnceWith('b');
    });

    it('ignores every key when the list is empty', () => {
        const onSelect = vi.fn();
        const { result } = renderHook(() => useRovingList({ items: [], onSelect }));

        press(result, 'ArrowDown', 'End', 'Enter');

        expect(result.current.activeIndex).toBe(0);
        expect(result.current.isLast).toBe(false);
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('returns to the first item when the list changes', () => {
        const { result, rerender } = renderHook(({ items }) => useRovingList({ items, onSelect: vi.fn() }), {
            initialProps: { items: ITEMS }
        });

        press(result, 'End');
        expect(result.current.activeIndex).toBe(2);

        rerender({ items: ['x', 'y'] });
        expect(result.current.activeIndex).toBe(0);
    });
});
