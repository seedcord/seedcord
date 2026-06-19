import type { Tagged } from 'type-fest';

/**
 * Absolute epoch milliseconds, the canonical JS time value from `Date.now()`.
 *
 * Branded apart from {@link EpochSec} because Discord `<t:...>` timestamp markup reads seconds, so an
 * epoch-ms value rendered there points roughly fifty years past the intended time. Convert with a
 * divide by 1000 before building the markup.
 */
export type EpochMs = Tagged<number, 'EpochMs'>;

/** Absolute epoch seconds, the unit Discord `<t:...>` timestamp markup reads. */
export type EpochSec = Tagged<number, 'EpochSec'>;
