import { REST } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { OAuthClient } from '#src/OAuthClient';

import { fakeDiscord } from './fakeDiscord';

import type { TokenStore } from '#src/TokenVault';
import type { SeenRequest } from './fakeDiscord';

const APP_ID = '1564002376115949650';
const USER = { id: '111', username: 'dhruv' };
const WEEK_SECONDS = 7 * 24 * 60 * 60;

interface Discord {
    requests: SeenRequest[];
    acceptedRefreshes: number;
    deadAccessTokens: Set<string>;
    // client() keeps its tokens here unless it gets another store
    store: Map<string, string>;
    api: string;
    client(store?: TokenStore): OAuthClient<'guilds', 'connections'>;
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

    const server = await fakeDiscord(({ route, body, headers }) => {
        if (discord.deadAccessTokens.has(headers.authorization?.replace('Bearer ', '') ?? '')) {
            return { status: 401, json: { message: '401: Unauthorized', code: 0 } };
        }
        const form = new URLSearchParams(body);
        if (route === '/oauth2/token' && form.get('grant_type') === 'authorization_code') return { json: grant() };
        if (route === '/oauth2/token') {
            if (form.get('refresh_token') !== live.refreshToken)
                return { status: 400, json: { error: 'invalid_grant' } };
            discord.acceptedRefreshes++;
            return { json: grant() };
        }
        if (route === '/oauth2/@me')
            return { json: { user: scope.includes('identify') ? USER : undefined, scopes: scope.split(' ') } };
        return { json: [] };
    });

    const discord: Discord = {
        requests: server.requests,
        api: server.api,
        acceptedRefreshes: 0,
        deadAccessTokens: new Set(),
        store: new Map(),
        client: (store = discord.store) =>
            new OAuthClient({
                rest: new REST({ api: server.api }).setToken('bot-token'),
                store,
                clientId: APP_ID,
                clientSecret: 'client-secret',
                baseUrl: 'https://bot.test/',
                scopes: ['guilds'],
                extraScopes: ['connections']
            })
    };
    return discord;
}

async function clientGranting(expiresIn: number, scope?: string): Promise<ReturnType<Discord['client']>> {
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
        expect(discord.acceptedRefreshes).toBe(0);
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
            baseUrl: 'https://bot.test/',
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

        expect(discord.acceptedRefreshes).toBe(1);
        expect(bearerOf(discord.requests, '/users/@me/guilds')).toEqual(['Bearer access-1']);
    });

    it('uses the tokens another process saved when it loses a refresh race', async () => {
        const discord = await discordGranting(60);
        const [first, second] = [discord.client(), discord.client()];
        await first.exchange('the-code');

        await Promise.all([first.as(USER.id).get('/users/@me/guilds'), second.as(USER.id).get('/users/@me/guilds')]);

        // one refresh won, and the loser read the winner's record
        expect(discord.acceptedRefreshes).toBe(1);
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

describe('OAuthClient scopes', () => {
    const LOGIN_NEEDED = { code: SeedcordErrorCode.PluginOAuthLoginNeeded };

    it('adds the extra scopes that a link lists to its authorize url', async () => {
        const oauth = await clientGranting(WEEK_SECONDS);

        const url = new URL(oauth.authorizeUrl({ state: 's', scopes: ['connections'] }));

        expect(url.searchParams.get('scope')).toBe('identify guilds connections');
    });

    it('reports the scopes that a user granted without calling Discord', async () => {
        const discord = await discordGranting(WEEK_SECONDS, 'identify guilds connections');
        const oauth = discord.client();
        await oauth.exchange('the-code');
        const before = discord.requests.length;

        expect(await oauth.scopesOf(USER.id)).toEqual(['identify', 'guilds', 'connections']);
        expect(await oauth.scopesOf('999')).toBeUndefined();
        expect(discord.requests).toHaveLength(before);
    });

    it('resolves to undefined for an extra scope the user has not granted, without calling Discord', async () => {
        const discord = await discordGranting(WEEK_SECONDS);
        const oauth = discord.client();
        await oauth.exchange('the-code');
        const before = discord.requests.length;

        expect(await oauth.as(USER.id).connections()).toBeUndefined();
        expect(discord.requests).toHaveLength(before);
    });

    it('calls Discord for an extra scope once the user granted it', async () => {
        const discord = await discordGranting(WEEK_SECONDS, 'identify guilds connections');
        const oauth = discord.client();
        await oauth.exchange('the-code');

        expect(await oauth.as(USER.id).connections()).toEqual([]);
        expect(discord.requests.at(-1)?.route).toBe('/users/@me/connections');
    });

    it('throws for a user whose login is older than a scope in scopes', async () => {
        const discord = await discordGranting(WEEK_SECONDS, 'identify');
        const oauth = discord.client();
        await oauth.exchange('the-code');
        const before = discord.requests.length;

        await expect(oauth.as(USER.id).guilds()).rejects.toMatchObject(LOGIN_NEEDED);
        expect(discord.requests).toHaveLength(before);
    });

    it('treats a scope that is in both lists as one from scopes', async () => {
        const discord = await discordGranting(WEEK_SECONDS, 'identify');
        const oauth = new OAuthClient({
            rest: new REST({ api: discord.api }),
            store: discord.store,
            clientId: APP_ID,
            clientSecret: 'client-secret',
            baseUrl: 'https://bot.test/',
            scopes: ['guilds'],
            extraScopes: ['guilds']
        });
        await oauth.exchange('the-code');

        await expect(oauth.as(USER.id).guilds()).rejects.toMatchObject(LOGIN_NEEDED);
    });

    it('deletes the tokens and throws when a typed call gets a 401', async () => {
        const discord = await discordGranting(WEEK_SECONDS);
        const oauth = discord.client();
        await oauth.exchange('the-code');
        discord.deadAccessTokens.add('access-0');

        await expect(oauth.as(USER.id).guilds()).rejects.toMatchObject(LOGIN_NEEDED);
        expect(discord.store.size).toBe(0);
    });

    // a client that's one refresh behind. another process refreshed the tokens, and this client's first
    // read still gets the old record with the access token that Discord already ended
    async function clientBehindARefresh(): Promise<{ discord: Discord; oauth: ReturnType<Discord['client']> }> {
        const discord = await discordGranting(WEEK_SECONDS);
        await discord.client().exchange('the-code');
        const stale = discord.store.get(USER.id);
        await discord.client().exchange('another-code');
        discord.deadAccessTokens.add('access-0');

        const reads = [stale];
        const oauth = discord.client({
            get: (userId) => (reads.length > 0 ? reads.shift() : discord.store.get(userId)),
            set: (userId, sealed) => discord.store.set(userId, sealed),
            delete: (userId) => discord.store.delete(userId)
        });
        return { discord, oauth };
    }

    it.each([
        ['a typed call', async (oauth: ReturnType<Discord['client']>) => oauth.as(USER.id).guilds()],
        ['a plain get()', async (oauth: ReturnType<Discord['client']>) => oauth.as(USER.id).get('/users/@me/guilds')]
    ])('retries a 401 on %s with the tokens that another process saved in the meantime', async (_name, call) => {
        const { discord, oauth } = await clientBehindARefresh();

        expect(await call(oauth)).toEqual([]);
        expect(bearerOf(discord.requests, '/users/@me/guilds')).toEqual(['Bearer access-0', 'Bearer access-1']);
        expect(discord.store.size).toBe(1);
    });

    it("passes on a plain get()'s 401 and keeps the tokens when nothing newer was saved", async () => {
        const discord = await discordGranting(WEEK_SECONDS);
        const oauth = discord.client();
        await oauth.exchange('the-code');
        discord.deadAccessTokens.add('access-0');

        await expect(oauth.as(USER.id).get('/users/@me/entitlements')).rejects.toMatchObject({ status: 401 });
        expect(discord.store.size).toBe(1);
    });
});

describe('OAuthClient calls that write', () => {
    const MEMBER = { user: USER, roles: [], joined_at: '2026-01-01T00:00:00.000Z' };

    // a user who is logged in with both scopes, against a discord where they're already in the 'member' server
    async function loggedIn(): Promise<{
        calls: ReturnType<OAuthClient<'guilds.join' | 'role_connections.write'>['as']>;
        requests: SeenRequest[];
        store: Map<string, string>;
    }> {
        const scope = 'identify guilds.join role_connections.write';
        const server = await fakeDiscord(({ route, body }) => {
            if (route === '/oauth2/token') {
                return {
                    json: {
                        token_type: 'Bearer',
                        access_token: 'a',
                        refresh_token: 'r',
                        expires_in: WEEK_SECONDS,
                        scope
                    }
                };
            }
            if (route === '/oauth2/@me') return { json: { user: USER, scopes: scope.split(' ') } };
            if (route === `/guilds/member/members/${USER.id}`) return { status: 204 };
            if (route === `/guilds/forbidden/members/${USER.id}`) {
                return { status: 403, json: { message: 'Missing Permissions', code: 50_013 } };
            }
            if (route.startsWith('/guilds/')) return { status: 201, json: MEMBER };
            return { json: JSON.parse(body) as unknown };
        });
        const store = new Map<string, string>();
        const oauth = new OAuthClient({
            rest: new REST({ api: server.api }).setToken('bot-token'),
            store,
            clientId: APP_ID,
            clientSecret: 'client-secret',
            baseUrl: 'https://bot.test/',
            scopes: ['guilds.join', 'role_connections.write']
        });
        await oauth.exchange('the-code');
        return { calls: oauth.as(USER.id), requests: server.requests, store };
    }

    it("adds the user to a server as the bot, with the user's token in the body", async () => {
        const { calls, requests } = await loggedIn();

        const joined = await calls.joinGuild('new', { nick: 'dhruv' });

        expect(joined).toEqual({ added: true, member: MEMBER });
        expect(requests.at(-1)).toMatchObject({ method: 'PUT', route: `/guilds/new/members/${USER.id}` });
        expect(requests.at(-1)?.headers.authorization).toBe('Bot bot-token');
        expect(JSON.parse(requests.at(-1)?.body ?? '')).toEqual({ nick: 'dhruv', access_token: 'a' });
    });

    it('reports a user who is already in the server', async () => {
        const { calls } = await loggedIn();

        expect(await calls.joinGuild('member')).toEqual({ added: false });
    });

    it("passes on Discord's refusal of a join and keeps the user's tokens", async () => {
        const { calls, store } = await loggedIn();

        await expect(calls.joinGuild('forbidden')).rejects.toMatchObject({ status: 403, code: 50_013 });
        expect(store.size).toBe(1);
    });

    it("writes the user's role connection for this application with their token", async () => {
        const { calls, requests } = await loggedIn();

        const stored = await calls.setRoleConnection({ platform_name: 'seedcord', metadata: { level: '3' } });

        expect(stored).toEqual({ platform_name: 'seedcord', metadata: { level: '3' } });
        expect(requests.at(-1)).toMatchObject({
            method: 'PUT',
            route: `/users/@me/applications/${APP_ID}/role-connection`
        });
        expect(requests.at(-1)?.headers.authorization).toBe('Bearer a');
    });
});

describe('OAuthClient with the bot and webhook scopes', () => {
    const GUILD = { id: '42', name: 'seedcord' };
    const WEBHOOK = { id: '7', url: 'https://discord.com/api/webhooks/7/token' };

    async function installer(): Promise<OAuthClient<'bot' | 'webhook.incoming'>> {
        const scope = 'identify bot webhook.incoming';
        const server = await fakeDiscord(({ route }) =>
            route === '/oauth2/token'
                ? {
                      json: {
                          token_type: 'Bearer',
                          access_token: 'a',
                          refresh_token: 'r',
                          expires_in: WEEK_SECONDS,
                          scope,
                          guild: GUILD,
                          webhook: WEBHOOK
                      }
                  }
                : { json: { user: USER, scopes: scope.split(' ') } }
        );
        return new OAuthClient({
            rest: new REST({ api: server.api }),
            store: new Map(),
            clientId: APP_ID,
            clientSecret: 'client-secret',
            baseUrl: 'https://bot.test/',
            scopes: ['bot', 'webhook.incoming']
        });
    }

    it('puts the permissions and the server pick in the authorize url', async () => {
        const oauth = await installer();

        const url = new URL(
            oauth.authorizeUrl({
                state: 's',
                permissions: 268_435_456n,
                guildId: '42',
                disableGuildSelect: true,
                integrationType: 0
            })
        );

        expect(Object.fromEntries(url.searchParams)).toMatchObject({
            scope: 'identify bot webhook.incoming',
            permissions: '268435456',
            guild_id: '42',
            disable_guild_select: 'true',
            integration_type: '0'
        });
    });

    it('returns the server that the bot joined and the webhook that Discord created', async () => {
        const oauth = await installer();

        expect(await oauth.exchange('the-code')).toEqual({
            user: USER,
            scopes: ['identify', 'bot', 'webhook.incoming'],
            guild: GUILD,
            webhook: WEBHOOK
        });
    });
});
