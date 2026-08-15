import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { describe, expect, it } from 'vitest';

import { reportFailure } from '#cli/reportFailure';

const THROWN = [
    new SeedcordError(SeedcordErrorCode.CreateCancelled),
    new SeedcordError(SeedcordErrorCode.CreateTargetNotEmpty, ['my-bot']),
    new SeedcordError(SeedcordErrorCode.CreateStepFailed, ['pnpm add', 'ECONNREFUSED']),
    new Error('boom'),
    'a string',
    undefined
];

describe('reportFailure', () => {
    it('exits a cancel successfully and prints no error above the closing line', () => {
        const failure = reportFailure(new SeedcordError(SeedcordErrorCode.CreateCancelled));

        expect(failure).toEqual({ code: 0, message: null, closing: 'Nothing was written.' });
    });

    it('prints the message of any other coded error', () => {
        const error = new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, ['dir', 'Nope.']);

        expect(reportFailure(error)).toEqual({ code: 1, message: '--dir: Nope.', closing: 'Nothing was created.' });
    });

    it('says the tree was removed when a scaffold step failed', () => {
        const error = new SeedcordError(SeedcordErrorCode.CreateStepFailed, ['pnpm add', 'ECONNREFUSED']);

        expect(reportFailure(error).closing).toBe('Nothing was kept.');
    });

    it('prints whatever an uncoded throw carries', () => {
        expect(reportFailure(new Error('the disk went away')).message).toBe('the disk went away');
    });

    it('survives a throw that is not an error at all', () => {
        expect(reportFailure('just a string').message).toBe('just a string');
    });

    it('closes the clack frame on every path', () => {
        expect(THROWN.map((error) => reportFailure(error).closing).filter((line) => line === '')).toEqual([]);
    });

    it('never returns an empty message, since every path that has one prints it', () => {
        expect(THROWN.map((error) => reportFailure(error).message).filter((message) => message === '')).toEqual([]);
    });
});
