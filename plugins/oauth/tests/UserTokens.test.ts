import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { UserTokens } from '#src/UserTokens';

import { APP_ID, CLIENT_SECRET, discordGranting, USER } from './discordGranting';

import type { Discord } from './discordGranting';

const LOGIN_NEEDED = { code: SeedcordErrorCode.PluginOAuthLoginNeeded };

// skips the waits between reads. no newer tokens ever show up in these tests
function tokensOn(discord: Discord, store = discord.store): UserTokens {
    return new UserTokens({
        rest: discord.rest(),
        store,
        clientId: APP_ID,
        clientSecret: CLIENT_SECRET,
        wait: () => Promise.resolve()
    });
}

describe('UserTokens', () => {
    it.each(['invalid_grant', 'invalid_request'] as const)(
        'throws once when Discord answers %s to a refresh, then without asking Discord again',
        async (answer) => {
            const discord = await discordGranting(60);
            discord.usedRefreshTokenAnswer = answer;
            const tokens = tokensOn(discord);
            await tokens.claim({ code: 'the-code', redirectUri: 'https://bot.test/oauth/callback' });
            // the user logged in again somewhere else on another store, which used up this store's refresh token
            await tokensOn(discord, new Map()).claim({
                code: 'another-code',
                redirectUri: 'https://bot.test/oauth/callback'
            });

            await expect(tokens.fresh(USER.id)).rejects.toMatchObject(LOGIN_NEEDED);
            const afterFirst = discord.requests.length;
            await expect(tokens.fresh(USER.id)).rejects.toMatchObject(LOGIN_NEEDED);

            expect(discord.requests).toHaveLength(afterFirst);
            expect(discord.store.size).toBe(1);
        }
    );
});
