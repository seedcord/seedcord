import { describe, expect, it } from 'vitest';

import { applicationIdFromToken } from '#src/applicationIdFromToken';
import { SeedcordErrorCode } from '#src/ErrorCodes';

const APP_ID = '1195232619718254663';

function tokenFor(firstSegment: string): string {
    return `${firstSegment}.${'b'.repeat(6)}.${'c'.repeat(27)}`;
}

describe('applicationIdFromToken', () => {
    it('reads the id out of the first segment', () => {
        expect(applicationIdFromToken(tokenFor(btoa(APP_ID)))).toBe(APP_ID);
    });

    it('reads a first segment written in the url-safe alphabet', () => {
        const urlSafe = btoa(APP_ID).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

        expect(applicationIdFromToken(tokenFor(urlSafe))).toBe(APP_ID);
    });

    it('throws on a segment length base64 cannot hold', () => {
        // validateDiscordToken accepts any first segment of 24 or more
        expect(() => applicationIdFromToken(tokenFor('a'.repeat(25)))).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.ConfigTokenUnreadable })
        );
    });

    it('throws when the segment decodes to something other than digits', () => {
        // 24 chars is a legal base64 length
        expect(() => applicationIdFromToken(tokenFor('a'.repeat(24)))).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.ConfigTokenUnreadable })
        );
    });
});
