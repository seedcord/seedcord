import { describe, expect, it } from 'vitest';

import { inviteUrl } from '#cli/invite';
import { tokenFor } from '#tests/token';

describe('inviteUrl', () => {
    it('reads the application id out of the first token part', () => {
        expect(inviteUrl(tokenFor('123456789012345678'))).toContain('client_id=123456789012345678');
    });

    it('takes an id that needed base64 padding Discord strips', () => {
        expect(inviteUrl(tokenFor('1234567890123456789'))).toContain('client_id=1234567890123456789');
    });

    it('carries the id alone, leaving the scopes to the app dashboard', () => {
        expect(inviteUrl(tokenFor('123456789012345678'))).toBe(
            'https://discord.com/oauth2/authorize?client_id=123456789012345678'
        );
    });

    it('says nothing for a token left for .env', () => {
        expect(inviteUrl(null)).toBeNull();
    });
});
