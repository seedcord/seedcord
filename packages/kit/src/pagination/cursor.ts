import { CustomId } from '@customId/CustomId';

import type { CustomIdField } from '@customId/Field';

// Included in the layout hash so it is fixed per prefix. Reducing it marks every active button as StaleCustomId.
// @internal
export const PAGE_MAX = 1_000_000;

// Discord rejects a message with duplicate custom_ids, and two controls can target the same page (first and
// prev both hit 0), so each control uses a distinct slot.
// @internal
export const SLOT_MAX = 4;

/**
 * A page cursor for a paginator. Use `PageCursor<'bans'>` or extract it from `typeof paginator.cursor`.
 *
 * @typeParam Prefix - The route prefix the dispatcher matches.
 */
export type PageCursor<Prefix extends string> = CustomId<
    Prefix,
    { page: CustomIdField<number>; slot: CustomIdField<number> }
>;

/**
 * Build the page cursor for a paginator. The bounded `page` and `slot` fields encode under Discord's
 * 100-char customId cap.
 *
 * @param prefix - The route prefix the dispatcher matches.
 * @returns A {@link PageCursor} for `prefix`.
 */
export function pageCursor<Prefix extends string>(prefix: Prefix): PageCursor<Prefix> {
    return new CustomId(prefix).int('page', 0, PAGE_MAX).int('slot', 0, SLOT_MAX);
}
