import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { describe, expect, it } from 'vitest';

import { reportFailure } from '@cli/reportFailure';

describe('reportFailure', () => {
    it('leaves a cancel silent and successful', () => {
        expect(reportFailure(new SeedcordError(SeedcordErrorCode.CreateCancelled))).toEqual({
            code: 0,
            message: null
        });
    });

    it('prints the message of any other coded error', () => {
        const error = new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, ['dir', 'Nope.']);

        expect(reportFailure(error)).toEqual({ code: 1, message: '--dir: Nope.' });
    });

    it('prints whatever an uncoded throw carries', () => {
        expect(reportFailure(new Error('the disk went away'))).toEqual({
            code: 1,
            message: 'the disk went away'
        });
    });

    it('survives a throw that is not an error at all', () => {
        expect(reportFailure('just a string')).toEqual({ code: 1, message: 'just a string' });
    });
});
