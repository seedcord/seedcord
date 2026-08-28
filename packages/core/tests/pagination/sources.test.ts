import { SeedcordRangeError } from '@seedcord/errors/internal';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { ArraySourceBase, CursorSourceBase } from '#pagination/sources';

// the sources only forward ctx to the loader, so a fake shape is enough
interface TestCtx {
    readonly tag: string;
}
const ctx: TestCtx = { tag: 'ctx' };

async function InfersItemTypeFromLoader(): Promise<void> {
    const source = new ArraySourceBase(() => ['a', 'b']);
    const view = await source.page(ctx, 0);
    expectTypeOf(view.items).toEqualTypeOf<string[]>();
}
void InfersItemTypeFromLoader;

describe('ArraySourceBase', () => {
    it('pages a loaded array through the pure math', async () => {
        const source = new ArraySourceBase(() => Array.from({ length: 25 }, (_, i) => i), { perPage: 10 });
        const view = await source.page(ctx, 1);
        expect(view.items).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
        expect(view.totalPages).toBe(3);
        expect(view.hasPrev).toBe(true);
        expect(view.hasNext).toBe(true);
    });

    it('forwards the context to the loader', async () => {
        const seen: TestCtx[] = [];
        const source = new ArraySourceBase<number, TestCtx>((received) => {
            seen.push(received);
            return [1, 2, 3];
        });
        await source.page(ctx, 0);
        expect(seen[0]).toBe(ctx);
    });

    it('defaults perPage to 10', async () => {
        const source = new ArraySourceBase(() => Array.from({ length: 25 }, (_, i) => i));
        const view = await source.page(ctx, 0);
        expect(view.items).toHaveLength(10);
        expect(view.totalPages).toBe(3);
    });

    it('awaits an async loader', async () => {
        const source = new ArraySourceBase(() => Promise.resolve([1, 2, 3]), { perPage: 2 });
        const view = await source.page(ctx, 1);
        expect(view.items).toEqual([3]);
    });

    it('rejects a non-positive or non-integer perPage at construction', () => {
        const load = (): number[] => [];
        expect(() => new ArraySourceBase(load, { perPage: 0 })).toThrow(SeedcordRangeError);
        expect(() => new ArraySourceBase(load, { perPage: -1 })).toThrow(SeedcordRangeError);
        expect(() => new ArraySourceBase(load, { perPage: 2.5 })).toThrow(SeedcordRangeError);
    });
});

describe('CursorSourceBase', () => {
    it('wraps one fetched page with an unknown total', async () => {
        const source = new CursorSourceBase(() => ({ items: ['a', 'b'], hasNext: true }), { perPage: 2 });
        const view = await source.page(ctx, 0);
        expect(view.items).toEqual(['a', 'b']);
        expect(view.page).toBe(0);
        expect(view.perPage).toBe(2);
        expect(view.totalPages).toBeUndefined();
        expect(view.hasPrev).toBe(false);
        expect(view.hasNext).toBe(true);
    });

    it('reports hasPrev from the page number', async () => {
        const source = new CursorSourceBase(() => ({ items: ['x'], hasNext: false }));
        const view = await source.page(ctx, 3);
        expect(view.page).toBe(3);
        expect(view.hasPrev).toBe(true);
        expect(view.hasNext).toBe(false);
    });

    it('forwards ctx, page, and perPage to the fetcher', async () => {
        const calls: [TestCtx, number, number][] = [];
        const source = new CursorSourceBase<never, TestCtx>(
            (received, page, perPage) => {
                calls.push([received, page, perPage]);
                return { items: [], hasNext: false };
            },
            { perPage: 5 }
        );
        await source.page(ctx, 2);
        expect(calls[0]).toEqual([ctx, 2, 5]);
    });

    it('clamps a negative page to zero', async () => {
        const source = new CursorSourceBase(() => ({ items: [], hasNext: false }));
        const view = await source.page(ctx, -3);
        expect(view.page).toBe(0);
        expect(view.hasPrev).toBe(false);
    });

    it('rejects a non-positive or non-integer perPage at construction', () => {
        const fetch = (): { items: number[]; hasNext: boolean } => ({ items: [], hasNext: false });
        expect(() => new CursorSourceBase(fetch, { perPage: 0 })).toThrow(SeedcordRangeError);
        expect(() => new CursorSourceBase(fetch, { perPage: -1 })).toThrow(SeedcordRangeError);
        expect(() => new CursorSourceBase(fetch, { perPage: 2.5 })).toThrow(SeedcordRangeError);
    });
});
