'use client';

import { useCallback, useState } from 'react';

import type { KeyboardEvent } from 'react';

export interface RovingGroup<TItem> {
    items: readonly TItem[];
    loading: boolean;
}

export interface RovingListOptions<TItem> {
    // a new query moves the highlight back to the first row
    query?: string;
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
    query: string;
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
    return stops[current + step];
}

function pick<TItem>(next: Picked<TItem>) {
    return (previous: Picked<TItem>): Picked<TItem> =>
        previous.query === next.query &&
        previous.item === next.item &&
        previous.pickedByPointer === next.pickedByPointer
            ? previous
            : next;
}

export function useRovingList<TItem>({ query = '', groups, onSelect }: RovingListOptions<TItem>): RovingList<TItem> {
    const { items, stops } = layout(groups);
    const [picked, setPicked] = useState<Picked<TItem>>({ query, item: undefined, pickedByPointer: false });
    const current = picked.query === query ? picked : undefined;

    // if the picked item leaves the list, the first row is active until it comes back
    const activeIndex = current?.item === undefined ? 0 : Math.max(0, items.indexOf(current.item));
    const active = items[activeIndex];
    const total = items.length;

    const pointAt = useCallback((item: TItem) => setPicked(pick({ query, item, pickedByPointer: true })), [query]);

    const onKeyDown = (event: RovingKey): void => {
        if (total === 0) return;

        const move = (next: number): void => {
            event.preventDefault();
            setPicked(pick({ query, item: items[clamp(next, total)], pickedByPointer: false }));
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
                const next = nextStop(stops, activeIndex, event.shiftKey ? -1 : 1);
                if (next === undefined) break;
                event.preventDefault();
                if (!next.loading) move(next.start);
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
    };

    return {
        active,
        hasGroups: stops.length > 1,
        isActive: (item) => item === active,
        isFirst: total > 0 && activeIndex === 0,
        isLast: total > 0 && activeIndex === total - 1,
        isGroupStart: stops.some((stop) => !stop.loading && stop.start === activeIndex),
        pickedByPointer: current?.pickedByPointer ?? false,
        pointAt,
        onKeyDown
    };
}
