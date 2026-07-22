import { afterEach, describe, expect, it, vi } from 'vitest';

import { currentTime } from '@src/numbers/currentTime';
import { toEpochSeconds } from '@src/numbers/toEpochSeconds';

import type { EpochMs } from '@seedcord/types';

describe('currentTime', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('converts now to epoch seconds with the same rounding as toEpochSeconds', () => {
        // a half-second past the boundary: round and floor disagree, so this pins the shared rounding rule.
        const now = 1_700_000_500_500;
        vi.spyOn(Date, 'now').mockReturnValue(now);
        expect(currentTime()).toBe(toEpochSeconds(now as EpochMs));
    });
});
