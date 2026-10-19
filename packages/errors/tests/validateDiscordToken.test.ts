import { describe, expect, it } from 'vite-plus/test';

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
                message: expect.stringContaining('DISCORD_BOT_TOKEN') as string
            })
        );
    });

    it.each([42, {}, 'not-a-token', 'short.bits.here'])('reports an invalid DISCORD_BOT_TOKEN for %p', (raw) => {
        expect(() => validateDiscordToken(raw)).toThrow(
            expect.objectContaining({
                code: SeedcordErrorCode.ConfigInvalidEnv,
                message: expect.stringContaining('DISCORD_BOT_TOKEN') as string
            })
        );
    });
});
