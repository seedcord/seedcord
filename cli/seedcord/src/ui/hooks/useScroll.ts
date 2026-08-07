import { useState } from 'react';

export interface ScrollApi<Item> {
    // oldest first, consumers render in array order
    readonly visible: readonly Item[];
    readonly following: boolean;
    readonly atTop: boolean;
    readonly above: number;
    readonly below: number;
    readonly up: (lines?: number) => void;
    readonly down: (lines?: number) => void;
    readonly pageUp: () => void;
    readonly pageDown: () => void;
    readonly toTop: () => void;
    readonly toBottom: () => void;
}

type ScrollKey = number | string;

interface ScrollView<Item> {
    readonly visible: readonly Item[];
    readonly topIndex: number;
    readonly following: boolean;
    readonly atTop: boolean;
    readonly above: number;
    readonly below: number;
}

// a null anchor follows the newest line. a key anchor pins the top row to that entry's current index, so
// the visible lines stay put while LogStore trims its head or appends. a trimmed-away anchor falls back to
// the oldest line.
export function computeScrollView<Item>(
    items: readonly Item[],
    viewportHeight: number,
    anchor: ScrollKey | null,
    getKey: (item: Item) => ScrollKey
): ScrollView<Item> {
    const height = Math.max(1, viewportHeight);
    const len = items.length;
    const maxTop = Math.max(0, len - height);

    let topIndex: number;
    if (anchor === null) {
        topIndex = maxTop;
    } else {
        const found = items.findIndex((item) => getKey(item) === anchor);
        topIndex = found === -1 ? 0 : found;
    }
    topIndex = Math.min(Math.max(0, topIndex), maxTop);

    const visible = items.slice(topIndex, topIndex + height);
    return {
        visible,
        topIndex,
        following: anchor === null || topIndex >= maxTop,
        atTop: topIndex === 0,
        above: topIndex,
        below: len - (topIndex + visible.length)
    };
}

export function useScroll<Item>(
    items: readonly Item[],
    viewportHeight: number,
    getKey: (item: Item) => ScrollKey
): ScrollApi<Item> {
    const [anchor, setAnchor] = useState<ScrollKey | null>(null);

    const height = Math.max(1, viewportHeight);
    const maxTop = Math.max(0, items.length - height);
    const view = computeScrollView(items, viewportHeight, anchor, getKey);

    const anchorAt = (nextTop: number): void => {
        const clamped = Math.min(Math.max(0, nextTop), maxTop);
        if (clamped >= maxTop) {
            setAnchor(null);
            return;
        }
        const entry = items[clamped];
        setAnchor(entry === undefined ? null : getKey(entry));
    };

    const up = (lines = 1): void => anchorAt(view.topIndex - lines);
    const down = (lines = 1): void => anchorAt(view.topIndex + lines);

    return {
        visible: view.visible,
        following: view.following,
        atTop: view.atTop,
        above: view.above,
        below: view.below,
        up,
        down,
        pageUp: () => up(height - 1),
        pageDown: () => down(height - 1),
        toTop: () => {
            const oldest = items[0];
            setAnchor(oldest === undefined ? null : getKey(oldest));
        },
        toBottom: () => setAnchor(null)
    };
}
