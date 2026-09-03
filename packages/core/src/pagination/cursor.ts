import { CustomId } from '@seedcord/custom-id';

import type { CustomIdField } from '@seedcord/custom-id';

// Included in the layout hash so it is fixed per prefix. Reducing it marks every active button as StaleCustomId.
// @internal
export const PAGE_MAX = 1_000_000;

// Discord rejects a message with duplicate custom_ids, and two controls can target the same page (first and
// prev both hit 0).
// @internal
const SLOT_MAX = 4;

/** Page cursor for a paginator. */
export type PageCursor<Prefix extends string> = CustomId<
    Prefix,
    { page: CustomIdField<number>; slot: CustomIdField<number> }
>;

/** Build the page cursor for a paginator. */
export function pageCursor<Prefix extends string>(prefix: Prefix): PageCursor<Prefix> {
    return new CustomId(prefix).int('page', 0, PAGE_MAX).int('slot', 0, SLOT_MAX);
}
