'use client';

import { useCallback, useState } from 'react';

import type { KeyboardEvent } from 'react';

export interface RovingGroup<TItem> {
    items: readonly TItem[];
    loading: boolean;
}

export interface RovingListOptions<TItem> {
    groups: readonly RovingGroup<TItem>[];
    onSelect: (item: TItem) => void;
}

export interface RowPosition {
    isFirst: boolean;
    isLast: boolean;
    isGroupStart: boolean;
    pickedByPointer: boolean;
}

type RovingKey = Pick<KeyboardEvent, 'key' | 'shiftKey' | 'preventDefault'>;

export interface RovingList<TItem> extends RowPosition {
    active: TItem | undefined;
    hasGroups: boolean;
    isActive: (item: TItem) => boolean;
    pointAt: (item: TItem) => void;
    onKeyDown: (event: RovingKey) => void;
}

interface TabStop {
    start: number;
    loading: boolean;
}

interface Layout<TItem> {
    items: TItem[];
    stops: TabStop[];
}

interface Picked<TItem> {
    item: TItem | undefined;
    pickedByPointer: boolean;
}

function layout<TItem>(groups: readonly RovingGroup<TItem>[]): Layout<TItem> {
    const items: TItem[] = [];
    const stops: TabStop[] = [];
    for (const group of groups) {
        if (group.loading || group.items.length > 0) stops.push({ start: items.length, loading: group.loading });
        items.push(...group.items);
    }
    return { items, stops };
}

function clamp(index: number, total: number): number {
    if (index < 0) return 0;
    return Math.min(index, total - 1);
}

function nextStop(stops: readonly TabStop[], activeIndex: number, step: 1 | -1): TabStop | undefined {
    const current = stops.findLastIndex((stop) => !stop.loading && stop.start <= activeIndex);
    return stops.at((current + step) % stops.length);
}

function pick<TItem>(item: TItem | undefined, pickedByPointer: boolean) {
    return (previous: Picked<TItem>): Picked<TItem> =>
        previous.item === item && previous.pickedByPointer === pickedByPointer ? previous : { item, pickedByPointer };
}

export function useRovingList<TItem>({ groups, onSelect }: RovingListOptions<TItem>): RovingList<TItem> {
    const { items, stops } = layout(groups);
    const [picked, setPicked] = useState<Picked<TItem>>({ item: undefined, pickedByPointer: false });

    // if the picked item leaves the list, the first row is active until it comes back
    const activeIndex = Math.max(0, picked.item === undefined ? 0 : items.indexOf(picked.item));
    const active = items[activeIndex];
    const total = items.length;

    const pointAt = useCallback((item: TItem) => setPicked(pick(item, true)), []);

    const onKeyDown = useCallback(
        (event: RovingKey): void => {
            if (total === 0) return;

            const move = (next: number): void => {
                event.preventDefault();
                setPicked(pick(items[clamp(next, total)], false));
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
                    if (stops.length < 2) break;
                    event.preventDefault();
                    const next = nextStop(stops, activeIndex, event.shiftKey ? -1 : 1);
                    if (next?.loading === false) move(next.start);
                    break;
                }
                case 'Enter': {
                    event.preventDefault();
                    if (active !== undefined) onSelect(active);
                    break;
                }
                default: {
                    break;
                }
            }
        },
        [active, activeIndex, items, onSelect, stops, total]
    );

    return {
        active,
        hasGroups: stops.length > 1,
        isActive: (item) => item === active,
        isFirst: total > 0 && activeIndex === 0,
        isLast: total > 0 && activeIndex === total - 1,
        isGroupStart: stops.some((stop) => !stop.loading && stop.start === activeIndex),
        pickedByPointer: picked.pickedByPointer,
        pointAt,
        onKeyDown
    };
}
