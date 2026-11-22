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

describe('UserTokens', () => {
    it.each(['invalid_grant', 'invalid_request'] as const)(
        'throws once when Discord answers %s to a refresh, then without asking Discord again',
        async (answer) => {
            const discord = await discordGranting(ABOUT_TO_EXPIRE_SECONDS);
            discord.usedRefreshTokenAnswer = answer;
            const tokens = tokensOn(discord);
            await tokens.claim({ code: 'the-code', redirectUri: REDIRECT_URI });
            await useUpTheRefreshToken(discord);

            const saved = await tokens.loggedIn(USER.id);
            await expect(tokens.unexpired(USER.id, saved)).rejects.toMatchObject(LOGIN_NEEDED);
            const afterFirst = discord.requests.length;
            await expect(tokens.unexpired(USER.id, saved)).rejects.toMatchObject(LOGIN_NEEDED);

            expect(discord.requests).toHaveLength(afterFirst);
            expect(discord.store.size).toBe(1);
        }
    );
});
