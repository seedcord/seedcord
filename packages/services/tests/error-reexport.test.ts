import { SeedcordError as ErrorsSeedcordError } from '@seedcord/errors/internal';
import { describe, expect, it } from 'vitest';

import { SeedcordErrorCode, isSeedcordError } from '../src';
import { SeedcordError as ServicesSeedcordError } from '../src/internal.index';

describe('error class identity through the services re-export', () => {
    it('recognizes an @seedcord/errors instance via the services public barrel', () => {
        const error = new ErrorsSeedcordError(SeedcordErrorCode.CoreSingletonViolation);

        expect(isSeedcordError(error)).toBe(true);
    });

    it('keeps one class identity across @seedcord/errors and @seedcord/services', () => {
        const error = new ErrorsSeedcordError(SeedcordErrorCode.CoreSingletonViolation);

        expect(error).toBeInstanceOf(ServicesSeedcordError);
        expect(ServicesSeedcordError).toBe(ErrorsSeedcordError);
    });
});
