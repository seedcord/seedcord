import { describe, expect, it } from 'vitest';

import { inviteUrl } from '#cli/invite';

function tokenFor(applicationId: string): string {
    return `${Buffer.from(applicationId, 'utf8').toString('base64url')}.bbbbbb.${'c'.repeat(38)}`;
}

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

    it('says nothing when the first part decodes to something other than an id', () => {
        expect(inviteUrl(`${'a'.repeat(26)}.bbbbbb.${'c'.repeat(38)}`)).toBeNull();
    });

    it('says nothing when the id is too short to be a snowflake', () => {
        expect(inviteUrl(tokenFor('1234'))).toBeNull();
    });

    it('says nothing for a value with no parts to read', () => {
        expect(inviteUrl('')).toBeNull();
    });
});
