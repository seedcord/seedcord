import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRovingList } from '#src/lib/useRovingList';

import type { RovingList } from '#src/lib/useRovingList';

const ITEMS: readonly string[] = ['a', 'b', 'c'];

function keyEvent(key: string, shiftKey = false, preventDefault = vi.fn()): Parameters<RovingList['onKeyDown']>[0] {
    return { key, shiftKey, preventDefault };
}

function press(result: { current: ReturnType<typeof useRovingList> }, ...keys: string[]): void {
    for (const key of keys) {
        const shifted = key.startsWith('Shift+');
        act(() => result.current.onKeyDown(keyEvent(shifted ? key.slice('Shift+'.length) : key, shifted)));
    }
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

    it('keeps the active item when the new list still holds it', () => {
        const { result, rerender } = renderHook(({ items }) => useRovingList({ items, onSelect: vi.fn() }), {
            initialProps: { items: ['a', 'b'] }
        });

        press(result, 'ArrowDown');
        rerender({ items: ['a', 'b', 'c'] });

        expect(result.current.activeIndex).toBe(1);
    });

    it('moves between group starts with Tab and Shift+Tab, wrapping at either end', () => {
        const items = ['a', 'b', 'c', 'd'];
        const groups = [
            { loading: false, start: 0 },
            { loading: false, start: 2 }
        ] as const;
        const { result } = renderHook(() => useRovingList({ items, groups, onSelect: vi.fn() }));

        press(result, 'ArrowDown', 'Tab');
        expect(result.current.activeIndex).toBe(2);

        press(result, 'Tab');
        expect(result.current.activeIndex).toBe(0);

        press(result, 'Shift+Tab');
        expect(result.current.activeIndex).toBe(2);
    });

    it('leaves Tab to the browser when there is one group', () => {
        const { result } = renderHook(() =>
            useRovingList({ items: ITEMS, groups: [{ loading: false, start: 0 }], onSelect: vi.fn() })
        );
        const preventDefault = vi.fn();

        act(() => result.current.onKeyDown(keyEvent('Tab', false, preventDefault)));

        expect(preventDefault).not.toHaveBeenCalled();
    });

    it('marks a row the pointer picked so the list leaves its scroll alone', () => {
        const { result } = renderHook(() => useRovingList({ items: ITEMS, onSelect: vi.fn() }));

        act(() => result.current.pointAt(2));
        expect(result.current.pickedByPointer).toBe(true);

        press(result, 'ArrowUp');
        expect(result.current.pickedByPointer).toBe(false);
    });

    it('holds Tab in place while the next group is still loading', () => {
        const { result } = renderHook(() =>
            useRovingList({
                items: ITEMS,
                groups: [{ loading: false, start: 0 }, { loading: true }],
                onSelect: vi.fn()
            })
        );
        const preventDefault = vi.fn();

        act(() => result.current.onKeyDown(keyEvent('Tab', false, preventDefault)));

        expect(preventDefault).toHaveBeenCalled();
        expect(result.current.activeIndex).toBe(0);
    });
});
