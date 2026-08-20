'use client';

import { useCallback, useState } from 'react';

import type { KeyboardEvent } from 'react';

export interface RovingListOptions<TItem> {
    items: readonly TItem[];
    onSelect: (item: TItem) => void;
}

export interface RovingList {
    activeIndex: number;
    isFirst: boolean;
    isLast: boolean;
    setActiveIndex: (index: number) => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

function clamp(index: number, total: number): number {
    if (index < 0) return 0;
    return Math.min(index, total - 1);
}

export function useRovingList<TItem>({ items, onSelect }: RovingListOptions<TItem>): RovingList {
    const [activeIndex, setActiveIndex] = useState(0);

    // react's adjust-state-during-render pattern, an effect here would cost a second pass
    const [trackedItems, setTrackedItems] = useState(items);
    if (trackedItems !== items) {
        setTrackedItems(items);
        setActiveIndex(0);
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
        [activeIndex, items, onSelect, total]
    );

    return {
        activeIndex,
        isFirst: activeIndex === 0,
        isLast: total > 0 && activeIndex === total - 1,
        setActiveIndex,
        onKeyDown
    };
}
