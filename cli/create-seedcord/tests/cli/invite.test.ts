import { describe, expect, it } from 'vitest';

import { inviteUrl } from '#cli/invite';
import { BOT_TOKEN } from '#tests/token';

describe('inviteUrl', () => {
    it("carries the token's application id alone, leaving the scopes to the app dashboard", () => {
        expect(inviteUrl(BOT_TOKEN)).toBe('https://discord.com/oauth2/authorize?client_id=1195232619718254663');
    });

    it('says nothing for a token left for .env', () => {
        expect(inviteUrl(null)).toBeNull();
    });
});
