import { describe, expect, it } from 'vitest';

import { SeedcordErrorCode } from '../src';
import { validateDiscordToken } from '../src/internal.index';

const validToken = `${'a'.repeat(24)}.${'b'.repeat(6)}.${'c'.repeat(27)}`;

describe('validateDiscordToken', () => {
    it('returns the trimmed value for a well-formed token', () => {
        expect(validateDiscordToken(`  ${validToken}  `)).toBe(validToken);
    });

    it.each([null, undefined, '', '   '])('throws ConfigMissingDiscordToken for %p', (raw) => {
        expect(() => validateDiscordToken(raw)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.ConfigMissingDiscordToken })
        );
    });

    it.each([42, {}, 'not-a-token', 'short.bits.here'])('throws ConfigIncorrectDiscordToken for %p', (raw) => {
        expect(() => validateDiscordToken(raw)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.ConfigIncorrectDiscordToken })
        );
    });
});
