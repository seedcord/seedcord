import { describe, expect, it } from 'vitest';

import { SeedcordErrorCode } from '#src/index';
import { validateDiscordToken } from '#src/internal.index';

const validToken = `${'a'.repeat(24)}.${'b'.repeat(6)}.${'c'.repeat(27)}`;

describe('validateDiscordToken', () => {
    it('returns the trimmed value for a well-formed token', () => {
        expect(validateDiscordToken(`  ${validToken}  `)).toBe(validToken);
    });

    it.each([null, undefined, '', '   '])('reports a missing DISCORD_BOT_TOKEN for %p', (raw) => {
        expect(() => validateDiscordToken(raw)).toThrow(
            expect.objectContaining({
                code: SeedcordErrorCode.ConfigMissingEnv,
                message: 'Missing DISCORD_BOT_TOKEN environment variable.'
            })
        );
    });

    it.each([42, {}, 'not-a-token', 'short.bits.here'])('reports an invalid DISCORD_BOT_TOKEN for %p', (raw) => {
        expect(() => validateDiscordToken(raw)).toThrow(
            expect.objectContaining({
                code: SeedcordErrorCode.ConfigInvalidEnv,
                message: 'Invalid DISCORD_BOT_TOKEN value.'
            })
        );
    });
});
