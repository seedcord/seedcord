import { toEpochSeconds } from './toEpochSeconds';

import type { EpochMs, EpochSec } from '@seedcord/types';

/** Current time in epoch seconds. Shares the one ms→s rounding rule with {@link toEpochSeconds}. */
export function currentTime(): EpochSec {
    return toEpochSeconds(Date.now() as EpochMs);
}
