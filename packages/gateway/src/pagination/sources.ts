import { ArraySourceBase, CursorSourceBase } from '@seedcord/core';

import type { PageContext } from './PageContext';
import type { PageSourceBase } from '@seedcord/core';

/**
 * The one method a paginator calls on a source, once per click. Implement it for a source neither shipped
 * one covers.
 *
 * @typeParam Item - The item type the source pages over.
 */
export type PageSource<Item> = PageSourceBase<Item, PageContext>;

/**
 * A source for a bounded list you can load whole. It loads the full list on every click, then slices the
 * page, so the real total is known (a real last button, "Page X of Y"). Cache inside your loader if the
 * load is expensive.
 *
 * @typeParam Item - The item type, inferred from the loader's return.
 */
export class ArraySource<Item> extends ArraySourceBase<Item, PageContext> {}

/**
 * A source for a large or unknown-length set you fetch one page at a time (SQL LIMIT/OFFSET, a paged API).
 * The fetcher receives the page index and the page size and reports whether a next page exists. A cursor
 * source has no cheap total, so `totalPages` is undefined, the last button is omitted, and the indicator
 * reads "Page X".
 *
 * @typeParam Item - The item type, inferred from the fetcher's slice.
 */
export class CursorSource<Item> extends CursorSourceBase<Item, PageContext> {}
