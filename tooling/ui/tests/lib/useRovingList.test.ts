import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRovingList } from '#src/lib/useRovingList';

import type { RovingGroup, RovingList } from '#src/lib/useRovingList';

const ITEMS: readonly string[] = ['a', 'b', 'c'];

const one = <TItem>(items: readonly TItem[]): RovingGroup<TItem>[] => [{ items, loading: false }];

function keyEvent(
    key: string,
    shiftKey = false,
    preventDefault = vi.fn()
): Parameters<RovingList<string>['onKeyDown']>[0] {
    return { key, shiftKey, preventDefault };
}

function press(result: { current: RovingList<string> }, ...keys: string[]): void {
    for (const key of keys) {
        const shifted = key.startsWith('Shift+');
        act(() => result.current.onKeyDown(keyEvent(shifted ? key.slice('Shift+'.length) : key, shifted)));
    }
}

describe('useRovingList', () => {
    it('starts on the first item', () => {
        const { result } = renderHook(() => useRovingList({ query: 'q', groups: one(ITEMS), onSelect: vi.fn() }));

        expect(result.current.active).toBe('a');
        expect(result.current.isFirst).toBe(true);
        expect(result.current.isLast).toBe(false);
    });

    it('stops at the last item instead of wrapping to the first', () => {
        const { result } = renderHook(() => useRovingList({ query: 'q', groups: one(ITEMS), onSelect: vi.fn() }));

        press(result, 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown');

        expect(result.current.active).toBe('c');
        expect(result.current.isLast).toBe(true);
    });

    it('stops at the first item instead of wrapping to the last', () => {
        const { result } = renderHook(() => useRovingList({ query: 'q', groups: one(ITEMS), onSelect: vi.fn() }));

        press(result, 'ArrowDown', 'ArrowUp', 'ArrowUp');

        expect(result.current.active).toBe('a');
    });

    it('jumps to either end with Home and End', () => {
        const { result } = renderHook(() => useRovingList({ query: 'q', groups: one(ITEMS), onSelect: vi.fn() }));

        press(result, 'End');
        expect(result.current.active).toBe('c');

        press(result, 'Home');
        expect(result.current.active).toBe('a');
    });

    it('selects the active item on Enter', () => {
        const onSelect = vi.fn();
        const { result } = renderHook(() => useRovingList({ query: 'q', groups: one(ITEMS), onSelect }));

        press(result, 'ArrowDown', 'Enter');

        expect(onSelect).toHaveBeenCalledExactlyOnceWith('b');
    });

    it('ignores every key when the list is empty', () => {
        const onSelect = vi.fn();
        const { result } = renderHook(() => useRovingList({ query: 'q', groups: one<string>([]), onSelect }));

        press(result, 'ArrowDown', 'End', 'Enter');

        expect(result.current.active).toBeUndefined();
        expect(result.current.isLast).toBe(false);
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('returns to the first item when the list changes', () => {
        const { result, rerender } = renderHook(
            ({ items }) => useRovingList({ query: 'q', groups: one(items), onSelect: vi.fn() }),
            {
                initialProps: { items: ITEMS }
            }
        );

        press(result, 'End');
        rerender({ items: ['x', 'y'] });

        expect(result.current.active).toBe('x');
    });

    it('goes back to the first row for a new query, even when the old row is still listed', () => {
        const groups = one(ITEMS);
        const { result, rerender } = renderHook(({ query }) => useRovingList({ query, groups, onSelect: vi.fn() }), {
            initialProps: { query: 'co' }
        });

        act(() => result.current.pointAt('c'));
        rerender({ query: 'coo' });

        expect(result.current.active).toBe('a');
        expect(result.current.pickedByPointer).toBe(false);
    });

    it('keeps the active row when a later group loads in', () => {
        const matches = [{ path: '/a' }, { path: '/b' }];
        const { result, rerender } = renderHook(
            ({ related }) =>
                useRovingList({
                    query: 'cooldown',
                    groups: [
                        { items: matches, loading: false },
                        { items: related, loading: related.length === 0 }
                    ],
                    onSelect: vi.fn()
                }),
            { initialProps: { related: [] as { path: string }[] } }
        );

        act(() => result.current.pointAt(matches[1]!));
        rerender({ related: [{ path: '/c' }] });

        expect(result.current.active).toBe(matches[1]);
    });

    it('moves between group starts with Tab and Shift+Tab, wrapping at either end', () => {
        const groups = [
            { items: ['a', 'b'], loading: false },
            { items: ['c', 'd'], loading: false }
        ];
        const { result } = renderHook(() => useRovingList({ query: 'q', groups, onSelect: vi.fn() }));

        press(result, 'ArrowDown', 'Tab');
        expect(result.current.active).toBe('c');

        press(result, 'Tab');
        expect(result.current.active).toBe('a');

        press(result, 'Shift+Tab');
        expect(result.current.active).toBe('c');
        expect(result.current.hasGroups).toBe(true);
    });

    it('leaves Tab to the browser when there is one group', () => {
        const { result } = renderHook(() => useRovingList({ query: 'q', groups: one(ITEMS), onSelect: vi.fn() }));
        const preventDefault = vi.fn();

        act(() => result.current.onKeyDown(keyEvent('Tab', false, preventDefault)));

        expect(preventDefault).not.toHaveBeenCalled();
        expect(result.current.hasGroups).toBe(false);
    });

    it('holds Tab in place while the next group is still loading', () => {
        const groups = [
            { items: ITEMS, loading: false },
            { items: [], loading: true }
        ];
        const { result } = renderHook(() => useRovingList({ query: 'q', groups, onSelect: vi.fn() }));
        const preventDefault = vi.fn();

        act(() => result.current.onKeyDown(keyEvent('Tab', false, preventDefault)));

        expect(preventDefault).toHaveBeenCalled();
        expect(result.current.active).toBe('a');
    });

    it('marks a row the pointer picked, until a key moves the selection', () => {
        const { result } = renderHook(() => useRovingList({ query: 'q', groups: one(ITEMS), onSelect: vi.fn() }));

        act(() => result.current.pointAt('c'));
        expect(result.current.pickedByPointer).toBe(true);
        expect(result.current.isActive('c')).toBe(true);

        press(result, 'ArrowUp');
        expect(result.current.pickedByPointer).toBe(false);
    });

    it('stops rendering while the pointer keeps moving over the row it picked', () => {
        const groups = one(ITEMS);
        let renders = 0;
        const { result } = renderHook(() => {
            renders += 1;
            return useRovingList({ query: 'q', groups, onSelect: vi.fn() });
        });

        act(() => result.current.pointAt('b'));
        const afterPick = renders;
        for (let move = 0; move < 5; move++) act(() => result.current.pointAt('b'));

        // react may render once more on an unchanged state before it skips the rest
        expect(renders - afterPick).toBeLessThanOrEqual(1);
    });
});
