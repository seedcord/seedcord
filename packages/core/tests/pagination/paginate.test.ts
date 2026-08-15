import { SeedcordRangeError } from '@seedcord/errors/internal';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { paginate } from '#pagination/paginate';

const items = Array.from({ length: 25 }, (_, i) => i);

describe('paginate', () => {
    it('slices the requested page and reports the bounds', () => {
        const view = paginate(items, 0, 10);
        expect(view.items).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(view.page).toBe(0);
        expect(view.perPage).toBe(10);
        expect(view.totalPages).toBe(3);
        expect(view.hasPrev).toBe(false);
        expect(view.hasNext).toBe(true);
    });

    it('reports the last page as having a previous page and no next', () => {
        const view = paginate(items, 2, 10);
        expect(view.items).toEqual([20, 21, 22, 23, 24]);
        expect(view.hasPrev).toBe(true);
        expect(view.hasNext).toBe(false);
    });

    it('clamps an above-range page to the last page', () => {
        const view = paginate(items, 99, 10);
        expect(view.page).toBe(2);
        expect(view.items).toEqual([20, 21, 22, 23, 24]);
    });

    it('clamps a negative page to the first page', () => {
        const view = paginate(items, -5, 10);
        expect(view.page).toBe(0);
        expect(view.items[0]).toBe(0);
    });

    it('floors a non-integer page before clamping', () => {
        const view = paginate(items, 1.7, 10);
        expect(view.page).toBe(1);
        expect(view.items).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    });

    it('treats an empty list as a single empty page', () => {
        const view = paginate([], 0, 10);
        expect(view.items).toEqual([]);
        expect(view.page).toBe(0);
        expect(view.totalPages).toBe(1);
        expect(view.hasPrev).toBe(false);
        expect(view.hasNext).toBe(false);
    });

    it('rejects a non-positive or non-integer perPage', () => {
        expect(() => paginate(items, 0, 0)).toThrow(SeedcordRangeError);
        expect(() => paginate(items, 0, -1)).toThrow(SeedcordRangeError);
        expect(() => paginate(items, 0, 2.5)).toThrow(SeedcordRangeError);
    });

    it('infers the item type from the input', () => {
        const view = paginate(['a', 'b', 'c'], 0, 2);
        expectTypeOf(view.items).toEqualTypeOf<string[]>();
    });
});
