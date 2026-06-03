import { describe, expect, it } from 'vitest';

import { computeScrollView } from '@ui/hooks/useScroll';

interface Row {
    id: number;
}

function rows(from: number, to: number): Row[] {
    const out: Row[] = [];
    for (let id = from; id <= to; id += 1) out.push({ id });
    return out;
}

const key = (row: Row): number => row.id;
const ids = (view: readonly Row[]): number[] => view.map((r) => r.id);

describe('computeScrollView', () => {
    it('follows the tail when the anchor is null', () => {
        const view = computeScrollView(rows(1, 10), 5, null, key);
        expect(ids(view.visible)).toEqual([6, 7, 8, 9, 10]);
        expect(view.following).toBe(true);
        expect(view.above).toBe(5);
        expect(view.below).toBe(0);
    });

    it('shows everything (and stays following) when the buffer is shorter than the viewport', () => {
        const view = computeScrollView(rows(1, 3), 5, null, key);
        expect(ids(view.visible)).toEqual([1, 2, 3]);
        expect(view.following).toBe(true);
        expect(view.atTop).toBe(true);
        expect(view.above).toBe(0);
        expect(view.below).toBe(0);
    });

    it('pins the window top to the anchored entry when scrolled up', () => {
        const view = computeScrollView(rows(1, 10), 5, 3, key);
        expect(ids(view.visible)).toEqual([3, 4, 5, 6, 7]);
        expect(view.following).toBe(false);
        expect(view.above).toBe(2);
        expect(view.below).toBe(3);
    });

    it('keeps the anchored window frozen as new lines append below it', () => {
        const before = computeScrollView(rows(1, 10), 5, 3, key);
        const after = computeScrollView(rows(1, 20), 5, 3, key);
        expect(ids(after.visible)).toEqual(ids(before.visible));
        expect(after.following).toBe(false);
        expect(after.below).toBe(13);
    });

    it('falls back to the oldest line when the anchored entry was trimmed from the head', () => {
        const view = computeScrollView(rows(6, 20), 5, 3, key);
        expect(ids(view.visible)).toEqual([6, 7, 8, 9, 10]);
        expect(view.atTop).toBe(true);
    });

    it('treats an anchor at or past the tail as following', () => {
        const view = computeScrollView(rows(1, 10), 5, 6, key);
        expect(view.topIndex).toBe(5);
        expect(view.following).toBe(true);
    });
});
