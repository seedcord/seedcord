import { SeedcordError as ErrorsSeedcordError } from '@seedcord/errors/internal';
import { describe, expect, it } from 'vitest';

import { SeedcordErrorCode, isSeedcordError } from '@src/index';
import { SeedcordError as SeedcordSeedcordError } from '@src/internal.index';

describe('error class identity through the seedcord re-export', () => {
    it('recognizes an @seedcord/errors instance via the seedcord public barrel', () => {
        const error = new ErrorsSeedcordError(SeedcordErrorCode.CoreSingletonViolation);

        expect(isSeedcordError(error)).toBe(true);
    });

    it('keeps one class identity across @seedcord/errors and seedcord', () => {
        const error = new ErrorsSeedcordError(SeedcordErrorCode.CoreSingletonViolation);

        expect(error).toBeInstanceOf(SeedcordSeedcordError);
        expect(SeedcordSeedcordError).toBe(ErrorsSeedcordError);
    });
});
