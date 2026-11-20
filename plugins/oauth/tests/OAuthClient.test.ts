import { REST } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { OAuthClient } from '#src/OAuthClient';

import { fakeDiscord } from './fakeDiscord';

import type { TokenStore } from '#src/TokenVault';
import type { SeenRequest } from './fakeDiscord';

const APP_ID = '1564002376115949650';
const USER = { id: '111', username: 'dhruv' };
const WEEK_SECONDS = 604_800;

interface Discord {
    requests: SeenRequest[];
    // how many refreshes Discord has accepted
    refreshed: number;
    client(store?: TokenStore): OAuthClient<'guilds'>;
}

// acts like Discord for one user. every refresh token works once, each token it grants lasts `expiresIn`,
// and the tokens are numbered in the order it granted them: access-0 and refresh-0, then access-1
async function discordGranting(expiresIn: number, scope = 'identify guilds'): Promise<Discord> {
    const live = { refreshToken: '', granted: 0 };
    const grant = (): object => {
        const number = live.granted++;
        live.refreshToken = `refresh-${number}`;
        return {
            token_type: 'Bearer',
            access_token: `access-${number}`,
            refresh_token: live.refreshToken,
            expires_in: expiresIn,
            scope
        };
    };

    const server = await fakeDiscord(({ route, body }) => {
        const form = new URLSearchParams(body);
        if (route === '/oauth2/token' && form.get('grant_type') === 'authorization_code') return { json: grant() };
        if (route === '/oauth2/token') {
            if (form.get('refresh_token') !== live.refreshToken)
                return { status: 400, json: { error: 'invalid_grant' } };
            discord.refreshed++;
            return { json: grant() };
        }
        if (route === '/oauth2/@me')
            return { json: { user: scope.includes('identify') ? USER : undefined, scopes: scope.split(' ') } };
        return { json: [] };
    });

    const shared = new Map<string, string>();
    const discord: Discord = {
        requests: server.requests,
        refreshed: 0,
        client: (store = shared) =>
            new OAuthClient({
                rest: new REST({ api: server.api }).setToken('bot-token'),
                store,
                clientId: APP_ID,
                clientSecret: 'client-secret',
                redirectUri: 'https://bot.test/oauth/callback',
                scopes: ['guilds']
            })
    };
    return discord;
}

async function clientGranting(expiresIn: number, scope?: string): Promise<OAuthClient<'guilds'>> {
    const discord = await discordGranting(expiresIn, scope);
    return discord.client();
}

function bearerOf(requests: SeenRequest[], route: string): (string | undefined)[] {
    return requests.filter((request) => request.route === route).map((request) => request.headers.authorization);
}

describe('OAuthClient.authorizeUrl', () => {
    it("builds Discord's authorize url with identify added", async () => {
        const oauth = await clientGranting(WEEK_SECONDS);

        const url = new URL(oauth.authorizeUrl({ state: 'the-state', codeChallenge: 'abc' }));

        expect(url.hostname).toBe('discord.com');
        expect(url.pathname).toMatch(/\/oauth2\/authorize$/u);
        expect(Object.fromEntries(url.searchParams)).toEqual({
            client_id: APP_ID,
            redirect_uri: 'https://bot.test/oauth/callback',
            response_type: 'code',
            scope: 'identify guilds',
            state: 'the-state',
            code_challenge: 'abc',
            code_challenge_method: 'S256'
        });
    });
});

describe('OAuthClient', () => {
    it('logs a user in and then calls Discord as them', async () => {
        const discord = await discordGranting(WEEK_SECONDS);
        const oauth = discord.client();

        const login = await oauth.exchange('the-code');
        await oauth.as(USER.id).get('/users/@me/guilds');

        expect(login).toEqual({ user: USER, scopes: ['identify', 'guilds'] });
        expect(bearerOf(discord.requests, '/users/@me/guilds')).toEqual(['Bearer access-0']);
        expect(discord.refreshed).toBe(0);
    });

    it('sends a typed call to its route with the query', async () => {
        const discord = await discordGranting(WEEK_SECONDS);
        const oauth = discord.client();
        await oauth.exchange('the-code');

        const guilds = await oauth.as(USER.id).guilds({ with_counts: true });

        expect(guilds).toEqual([]);
        expect(discord.requests.at(-1)).toMatchObject({
            method: 'GET',
            route: '/users/@me/guilds',
            search: '?with_counts=true'
        });
        expect(discord.requests.at(-1)?.headers.authorization).toBe('Bearer access-0');
    });

    it('resolves to undefined for a code that Discord refuses', async () => {
        const server = await fakeDiscord(() => ({ status: 400, json: { error: 'invalid_grant' } }));
        const oauth = new OAuthClient({
            rest: new REST({ api: server.api }),
            store: new Map(),
            clientId: APP_ID,
            clientSecret: 'client-secret',
            redirectUri: 'https://bot.test/oauth/callback',
            scopes: []
        });

        expect(await oauth.exchange('used-code')).toBeUndefined();
    });

    it("throws when the login's scopes don't include identify", async () => {
        const oauth = await clientGranting(WEEK_SECONDS, 'guilds');

        await expect(oauth.exchange('the-code')).rejects.toMatchObject({
            code: SeedcordErrorCode.PluginOAuthIdentifyMissing
        });
    });

    it('refreshes a token that is about to expire before the call', async () => {
        const discord = await discordGranting(60);
        const oauth = discord.client();
        await oauth.exchange('the-code');

        await oauth.as(USER.id).get('/users/@me/guilds');

        expect(discord.refreshed).toBe(1);
        expect(bearerOf(discord.requests, '/users/@me/guilds')).toEqual(['Bearer access-1']);
    });

    it('uses the tokens another process saved when it loses a refresh race', async () => {
        const discord = await discordGranting(60);
        const [first, second] = [discord.client(), discord.client()];
        await first.exchange('the-code');

        await Promise.all([first.as(USER.id).get('/users/@me/guilds'), second.as(USER.id).get('/users/@me/guilds')]);

        // one refresh won, and the loser read the winner's record
        expect(discord.refreshed).toBe(1);
        expect(bearerOf(discord.requests, '/users/@me/guilds')).toEqual(['Bearer access-1', 'Bearer access-1']);
    });

    it('deletes the tokens and throws once the grant has ended', async () => {
        const discord = await discordGranting(60);
        const oauth = discord.client();
        await oauth.exchange('the-code');
        // the user logs in somewhere else on another store, which uses up this store's refresh token
        await discord.client(new Map()).exchange('another-code');

        const loginNeeded = { code: SeedcordErrorCode.PluginOAuthLoginNeeded };
        await expect(oauth.as(USER.id).get('/users/@me/guilds')).rejects.toMatchObject(loginNeeded);

        const tokenCalls = discord.requests.filter((request) => request.route === '/oauth2/token').length;
        await expect(oauth.as(USER.id).get('/users/@me/guilds')).rejects.toMatchObject(loginNeeded);
        expect(discord.requests.filter((request) => request.route === '/oauth2/token')).toHaveLength(tokenCalls);
    });

    it('throws for a user who never logged in', async () => {
        const oauth = await clientGranting(WEEK_SECONDS);

        await expect(oauth.as('999').get('/users/@me')).rejects.toMatchObject({
            code: SeedcordErrorCode.PluginOAuthLoginNeeded
        });
    });

    it("forget() deletes a user's tokens without calling Discord", async () => {
        const discord = await discordGranting(WEEK_SECONDS);
        const oauth = discord.client();
        await oauth.exchange('the-code');
        const before = discord.requests.length;

        await oauth.forget(USER.id);

        expect(discord.requests).toHaveLength(before);
        await expect(oauth.as(USER.id).get('/users/@me')).rejects.toMatchObject({
            code: SeedcordErrorCode.PluginOAuthLoginNeeded
        });
    });

    it("revokes a user's grant on Discord and deletes their tokens", async () => {
        const discord = await discordGranting(WEEK_SECONDS);
        const oauth = discord.client();
        await oauth.exchange('the-code');

        await oauth.revoke(USER.id);

        const revoke = discord.requests.find((request) => request.route === '/oauth2/token/revoke');
        expect(new URLSearchParams(revoke?.body).get('token')).toBe('refresh-0');
        await expect(oauth.as(USER.id).get('/users/@me')).rejects.toMatchObject({
            code: SeedcordErrorCode.PluginOAuthLoginNeeded
        });
    });
});
