'use client';

import { useCallback, useState } from 'react';

import type { KeyboardEvent } from 'react';

export interface RovingListOptions<TItem> {
    items: readonly TItem[];
    onSelect: (item: TItem) => void;
    // Tab jumps between these. pass items.length for a group that's still loading
    groupStarts?: readonly number[];
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

const NO_GROUPS: readonly number[] = [];

function clamp(index: number, total: number): number {
    if (index < 0) return 0;
    return Math.min(index, total - 1);
}

function nextGroupStart(starts: readonly number[], activeIndex: number, step: 1 | -1): number {
    const current = starts.findLastIndex((start) => start <= activeIndex);
    return starts.at((current + step) % starts.length) ?? 0;
}

export function useRovingList<TItem>({
    items,
    onSelect,
    groupStarts = NO_GROUPS
}: RovingListOptions<TItem>): RovingList {
    const [{ activeIndex, pickedByPointer }, setActive] = useState({ activeIndex: 0, pickedByPointer: false });
    const setActiveIndex = useCallback(
        (index: number) => setActive({ activeIndex: index, pickedByPointer: false }),
        []
    );
    const pointAt = useCallback((index: number) => setActive({ activeIndex: index, pickedByPointer: true }), []);

    // react's adjust-state-during-render pattern, an effect here would cost a second pass
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
                    if (groupStarts.length < 2) break;
                    event.preventDefault();
                    const next = nextGroupStart(groupStarts, activeIndex, event.shiftKey ? -1 : 1);
                    if (next < total) setActiveIndex(next);
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
        [activeIndex, groupStarts, items, onSelect, total, setActiveIndex]
    );

    return {
        activeIndex,
        isFirst: activeIndex === 0,
        isLast: total > 0 && activeIndex === total - 1,
        isGroupStart: groupStarts.includes(activeIndex),
        pickedByPointer,
        pointAt,
        onKeyDown
    };
}
