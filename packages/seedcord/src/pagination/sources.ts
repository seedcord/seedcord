import { paginate } from '@seedcord/core';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError } from '@seedcord/errors/internal';

import type { PageContext } from './PageContext';
import type { PageView } from '@seedcord/core';
import type { Promisable } from 'type-fest';

const DEFAULT_PER_PAGE = 10;

/**
 * The one method a paginator calls on a source, once per click. Implement it to supply a custom source.
 *
 * @typeParam Item - The item type the source pages over.
 */
export interface PageSource<Item> {
    page(ctx: PageContext, n: number): Promise<PageView<Item>>;
}

/**
 * A source for a bounded list you can load whole. It loads the full list on every click, then slices the
 * page via {@link paginate}, so the real total is known (a real last button, "Page X of Y"). Cache inside
 * your loader if the load is expensive.
 *
 * @typeParam Item - The item type, inferred from the loader's return.
 */
export class ArraySource<Item> implements PageSource<Item> {
    private readonly perPage: number;

    constructor(
        private readonly load: (ctx: PageContext) => Promisable<readonly Item[]>,
        opts?: { perPage?: number }
    ) {
        this.perPage = opts?.perPage ?? DEFAULT_PER_PAGE;
        if (!Number.isSafeInteger(this.perPage) || this.perPage <= 0) {
            throw new SeedcordRangeError(SeedcordErrorCode.PaginationInvalidPerPage, [this.perPage]);
        }
    }

    async page(ctx: PageContext, n: number): Promise<PageView<Item>> {
        return paginate(await this.load(ctx), n, this.perPage);
    }
}

/**
 * A source for a large or unknown-length set you fetch one page at a time (SQL LIMIT/OFFSET, a paged API).
 * The fetcher receives the page index and the page size and reports whether a next page exists. A cursor
 * source has no cheap total, so `totalPages` is undefined, the last button is omitted, and the indicator
 * reads "Page X".
 *
 * @typeParam Item - The item type, inferred from the fetcher's slice.
 */
export class CursorSource<Item> implements PageSource<Item> {
    private readonly perPage: number;

    constructor(
        private readonly fetch: (
            ctx: PageContext,
            page: number,
            perPage: number
        ) => Promisable<{ items: readonly Item[]; hasNext: boolean }>,
        opts?: { perPage?: number }
    ) {
        this.perPage = opts?.perPage ?? DEFAULT_PER_PAGE;
        if (!Number.isSafeInteger(this.perPage) || this.perPage <= 0) {
            throw new SeedcordRangeError(SeedcordErrorCode.PaginationInvalidPerPage, [this.perPage]);
        }
    }

    async page(ctx: PageContext, n: number): Promise<PageView<Item>> {
        const page = Math.max(0, Math.trunc(n));
        const { items, hasNext } = await this.fetch(ctx, page, this.perPage);
        return { items: [...items], page, perPage: this.perPage, hasPrev: page > 0, hasNext };
    }
}
