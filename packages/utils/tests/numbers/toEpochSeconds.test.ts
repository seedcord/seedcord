import { describe, it, expect, expectTypeOf } from 'vitest';

import { toEpochSeconds } from '@src/numbers/toEpochSeconds';

import type { EpochMs, EpochSec } from '@seedcord/types';

describe('toEpochSeconds', () => {
    it('converts epoch milliseconds to epoch seconds, typed as EpochSec', () => {
        const seconds = toEpochSeconds(1_700_000_500_400 as EpochMs);

        expect(seconds).toBe(1_700_000_500);
        expectTypeOf(seconds).toEqualTypeOf<EpochSec>();
    });

    it('rounds to the nearest second', () => {
        expect(toEpochSeconds(1500 as EpochMs)).toBe(2);
        expect(toEpochSeconds(1400 as EpochMs)).toBe(1);
    });
});
