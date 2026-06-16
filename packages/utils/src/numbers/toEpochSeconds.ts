import type { EpochMs, EpochSec } from '@seedcord/types';

/** Converts absolute epoch milliseconds to epoch seconds, the unit Discord `<t:...>` timestamp markup reads. */
export function toEpochSeconds(ms: EpochMs): EpochSec {
    return Math.round(ms / 1000) as EpochSec;
}
