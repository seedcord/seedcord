import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { describe, expect, it } from 'vitest';

import { reportFailure } from '@cli/reportFailure';

describe('reportFailure', () => {
    it('exits a cancel successfully and still says something', () => {
        const failure = reportFailure(new SeedcordError(SeedcordErrorCode.CreateCancelled));

        expect(failure).toEqual({ code: 0, cancelled: true, message: 'Nothing was written.' });
    });

    it('prints the message of any other coded error', () => {
        const error = new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, ['dir', 'Nope.']);

        expect(reportFailure(error)).toEqual({ code: 1, cancelled: false, message: '--dir: Nope.' });
    });

    it('prints whatever an uncoded throw carries', () => {
        expect(reportFailure(new Error('the disk went away'))).toEqual({
            code: 1,
            cancelled: false,
            message: 'the disk went away'
        });
    });

    it('survives a throw that is not an error at all', () => {
        expect(reportFailure('just a string')).toEqual({
            code: 1,
            cancelled: false,
            message: 'just a string'
        });
    });

    it('never returns an empty message, since every path prints one', () => {
        const thrown = [
            new SeedcordError(SeedcordErrorCode.CreateCancelled),
            new SeedcordError(SeedcordErrorCode.CreateTargetNotEmpty, ['my-bot']),
            new Error('boom'),
            'a string',
            undefined
        ];

        expect(thrown.map((error) => reportFailure(error).message).filter((message) => message === '')).toEqual([]);
    });
});
