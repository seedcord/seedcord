import type { EpochSec } from '@seedcord/types';

/** Current time in epoch seconds. */
export function currentTime(): EpochSec {
    return Math.floor(Date.now() / 1000) as EpochSec;
}
