import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError } from '@seedcord/errors/internal';

import type { PageView } from './PageView';

/**
 * Pure page math, usable headless. Clamps `page` into range and slices the window.
 *
 * @param items - The full list to page over.
 * @param page - The requested zero-based page, clamped into `[0, totalPages - 1]`.
 * @param perPage - The page size. Must be a positive integer.
 * @returns The sliced {@link PageView}, with `totalPages` always known.
 * @throws SeedcordRangeError when `perPage` is not a positive integer.
 */
export function paginate<Item>(items: readonly Item[], page: number, perPage: number): PageView<Item> {
    if (!Number.isSafeInteger(perPage) || perPage <= 0) {
        throw new SeedcordRangeError(SeedcordErrorCode.PaginationInvalidPerPage, [perPage]);
    }

    const totalPages = Math.max(1, Math.ceil(items.length / perPage));
    const clamped = Math.min(Math.max(Math.trunc(page), 0), totalPages - 1);
    const start = clamped * perPage;

    return {
        items: items.slice(start, start + perPage),
        page: clamped,
        perPage,
        totalPages,
        hasPrev: clamped > 0,
        hasNext: clamped < totalPages - 1
    };
}
