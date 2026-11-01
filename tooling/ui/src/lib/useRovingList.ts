'use client';

import { useCallback, useState } from 'react';

import type { KeyboardEvent } from 'react';

// Tab jumps to the start of each group and holds still on a group that's loading
export type RovingGroup = { loading: false; start: number } | { loading: true };

export interface RovingListOptions<TItem> {
    items: readonly TItem[];
    onSelect: (item: TItem) => void;
    groups?: readonly RovingGroup[];
}

export interface RowPosition {
    isFirst: boolean;
    isLast: boolean;
    isGroupStart: boolean;
    pickedByPointer: boolean;
}

export interface RovingList extends RowPosition {
    activeIndex: number;
    pointAt: (index: number) => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

const NO_GROUPS: readonly RovingGroup[] = [];

function clamp(index: number, total: number): number {
    if (index < 0) return 0;
    return Math.min(index, total - 1);
}

function nextGroup(groups: readonly RovingGroup[], activeIndex: number, step: 1 | -1): RovingGroup | undefined {
    const current = groups.findLastIndex((group) => !group.loading && group.start <= activeIndex);
    return groups.at((current + step) % groups.length);
}

export function useRovingList<TItem>({ items, onSelect, groups = NO_GROUPS }: RovingListOptions<TItem>): RovingList {
    const [{ activeIndex, pickedByPointer }, setActive] = useState({ activeIndex: 0, pickedByPointer: false });
    const setActiveIndex = useCallback(
        (index: number) => setActive({ activeIndex: index, pickedByPointer: false }),
        []
    );
    const pointAt = useCallback((index: number) => setActive({ activeIndex: index, pickedByPointer: true }), []);

    // adjusting state during render skips the extra render an effect would cost
    const [trackedItems, setTrackedItems] = useState(items);
    if (trackedItems !== items) {
        setTrackedItems(items);
        const active = trackedItems[activeIndex];
        setActiveIndex(active === undefined ? 0 : Math.max(0, items.indexOf(active)));
    }

    const total = items.length;

    const onKeyDown = useCallback(
        (event: KeyboardEvent<HTMLElement>): void => {
            if (total === 0) return;

            const move = (next: number): void => {
                event.preventDefault();
                setActiveIndex(clamp(next, total));
            };

            switch (event.key) {
                case 'ArrowDown': {
                    move(activeIndex + 1);
                    break;
                }
                case 'ArrowUp': {
                    move(activeIndex - 1);
                    break;
                }
                case 'Home': {
                    move(0);
                    break;
                }
                case 'End': {
                    move(total - 1);
                    break;
                }
                case 'Tab': {
                    if (groups.length < 2) break;
                    event.preventDefault();
                    const next = nextGroup(groups, activeIndex, event.shiftKey ? -1 : 1);
                    if (next?.loading === false) setActiveIndex(next.start);
                    break;
                }
                case 'Enter': {
                    event.preventDefault();
                    const active = items[activeIndex];
                    if (active !== undefined) onSelect(active);
                    break;
                }
                default: {
                    break;
                }
            }
        },
        [activeIndex, groups, items, onSelect, total, setActiveIndex]
    );

    return {
        activeIndex,
        isFirst: activeIndex === 0,
        isLast: total > 0 && activeIndex === total - 1,
        isGroupStart: groups.some((group) => !group.loading && group.start === activeIndex),
        pickedByPointer,
        pointAt,
        onKeyDown
    };
}
