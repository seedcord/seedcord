import { describe, expect, it } from 'vitest';

import { SeedcordErrorCode } from '#src/index';
import { validateDiscordToken } from '#src/internal.index';

const APP_ID = '1195232619718254663';

function tokenFor(firstSegment: string): string {
    return `${firstSegment}.${'b'.repeat(6)}.${'c'.repeat(27)}`;
}

// discord strips the base64 padding
function tokenOf(applicationId: string): string {
    return tokenFor(btoa(applicationId).replaceAll('=', ''));
}

describe('validateDiscordToken', () => {
    it('returns the trimmed token and the application id in its first part', () => {
        const token = tokenOf(APP_ID);

        expect(validateDiscordToken(`  ${token}  `)).toEqual({ value: token, applicationId: APP_ID });
    });

    it('reads a first part written in the url-safe alphabet', () => {
        const urlSafe = btoa(APP_ID).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

        expect(validateDiscordToken(tokenFor(urlSafe)).applicationId).toBe(APP_ID);
    });

    it('accepts a token from an app old enough to have a 17-digit id', () => {
        expect(validateDiscordToken(tokenOf('10000000000000000')).applicationId).toBe('10000000000000000');
    });

    it.each([null, undefined, '', '   '])('reports a missing DISCORD_BOT_TOKEN for %p', (raw) => {
        expect(() => validateDiscordToken(raw)).toThrow(
            expect.objectContaining({
                code: SeedcordErrorCode.ConfigMissingEnv,
                message: expect.stringContaining('DISCORD_BOT_TOKEN') as string
            })
        );
    });

    it.each([42, {}, 'not-a-token', 'short.bits.here', tokenFor('a'.repeat(24)), tokenFor('a'.repeat(25))])(
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
