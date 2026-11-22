import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { UserTokens } from '#src/UserTokens';

import { APP_ID, CLIENT_SECRET, discordGranting, USER } from './discordGranting';
import { ABOUT_TO_EXPIRE_SECONDS } from './fakeDiscord';

import type { Discord } from './discordGranting';

const LOGIN_NEEDED = { code: SeedcordErrorCode.PluginOAuthLoginNeeded };
const REDIRECT_URI = 'https://bot.test/oauth/callback';

const withoutWaiting = (): Promise<void> => Promise.resolve();

function tokensOn(discord: Discord, store = discord.store): UserTokens {
    return new UserTokens({
        rest: discord.rest(),
        store,
        clientId: APP_ID,
        clientSecret: CLIENT_SECRET,
        wait: withoutWaiting
    });
}

async function useUpTheRefreshToken(discord: Discord): Promise<void> {
    const anotherStore = new Map<string, string>();
    await tokensOn(discord, anotherStore).claim({ code: 'another-code', redirectUri: REDIRECT_URI });
}

async function refreshRequestsFromTwoCalls(answer: Discord['usedRefreshTokenAnswer']): Promise<number> {
    const discord = await discordGranting(ABOUT_TO_EXPIRE_SECONDS);
    discord.usedRefreshTokenAnswer = answer;
    const tokens = tokensOn(discord);
    await tokens.claim({ code: 'the-code', redirectUri: REDIRECT_URI });
    await useUpTheRefreshToken(discord);
    const beforeTheRefreshes = discord.requests.length;

    const saved = await tokens.loggedIn(USER.id);
    await expect(tokens.unexpired(USER.id, saved)).rejects.toMatchObject(LOGIN_NEEDED);
    await expect(tokens.unexpired(USER.id, saved)).rejects.toMatchObject(LOGIN_NEEDED);

    expect(discord.store.size).toBe(1);
    return discord.requests.length - beforeTheRefreshes;
}

describe('UserTokens', () => {
    it("doesn't send a refresh token again after Discord answered invalid_grant to it", async () => {
        expect(await refreshRequestsFromTwoCalls('invalid_grant')).toBe(1);
    });

    it('sends a refresh token again after invalid_request, which Discord answers while another refresh runs', async () => {
        expect(await refreshRequestsFromTwoCalls('invalid_request')).toBe(2);
    });
});
