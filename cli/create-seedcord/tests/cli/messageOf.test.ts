import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { describe, expect, it } from 'vitest';

import { messageOf } from '#cli/messageOf';

describe('messageOf', () => {
    it('returns the message of a coded error', () => {
        const error = new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, ['dir', 'Nope.']);

        expect(messageOf(error)).toBe('--dir: Nope.');
    });

    it('returns whatever an uncoded throw carries', () => {
        expect(messageOf(new Error('the disk went away'))).toBe('the disk went away');
    });

    it('turns a throw that is not an error into a string', () => {
        expect(messageOf('just a string')).toBe('just a string');
    });
});
