import { describe, expect, it } from 'vitest';

import { SeedcordErrorCode } from '#src/index';
import { applicationIdFromToken, validateDiscordToken } from '#src/internal.index';

const APP_ID = '1195232619718254663';

function tokenFor(firstSegment: string): string {
    return `${firstSegment}.${'b'.repeat(6)}.${'c'.repeat(27)}`;
}

// discord strips the base64 padding
const validToken = tokenFor(btoa(APP_ID).replaceAll('=', ''));

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

    it.each([42, {}, 'not-a-token', 'short.bits.here', tokenFor('a'.repeat(24))])(
        'reports an invalid DISCORD_BOT_TOKEN for %p',
        (raw) => {
            expect(() => validateDiscordToken(raw)).toThrow(
                expect.objectContaining({
                    code: SeedcordErrorCode.ConfigInvalidEnv,
                    message: expect.stringContaining('DISCORD_BOT_TOKEN') as string
                })
            );
        }
    );
});

describe('applicationIdFromToken', () => {
    it('reads the id out of the first segment', () => {
        expect(applicationIdFromToken(validToken)).toBe(APP_ID);
    });

    it('reads a first segment written in the url-safe alphabet', () => {
        const urlSafe = btoa(APP_ID).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

        expect(applicationIdFromToken(tokenFor(urlSafe))).toBe(APP_ID);
    });

    it('throws on a segment length base64 cannot hold', () => {
        expect(() => applicationIdFromToken(tokenFor('a'.repeat(25)))).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.ConfigInvalidEnv })
        );
    });
});
