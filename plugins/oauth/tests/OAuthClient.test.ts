import { REST } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { delay } from 'es-toolkit';
import { describe, expect, it, vi } from 'vite-plus/test';

import { OAuthClient } from '#src/OAuthClient';

import { APP_ID, CLIENT_SECRET, discordGranting, USER } from './discordGranting';
import { ABOUT_TO_EXPIRE_SECONDS, fakeDiscord, WEEK_SECONDS } from './fakeDiscord';

import type { TokenStore } from '#src/TokenVault';
import type { Discord } from './discordGranting';
import type { SeenRequest } from './fakeDiscord';

const SAVE_SLOWER_THAN_ONE_REREAD_MS = 300;

async function clientGranting(expiresIn: number, scope?: string): Promise<ReturnType<Discord['client']>> {
    const discord = await discordGranting(expiresIn, scope);
    return discord.client();
}

function bearerOf(requests: SeenRequest[], route: string): (string | undefined)[] {
    return requests.filter((request) => request.route === route).map((request) => request.headers.authorization);
}

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

    it("throws when the login's scopes don't include identify", async () => {
        const oauth = await clientGranting(WEEK_SECONDS, 'guilds');

        await expect(oauth.exchange('the-code')).rejects.toMatchObject({
            code: SeedcordErrorCode.PluginOAuthIdentifyMissing
        });
    });

    it('refreshes a token that is about to expire before the call', async () => {
        const discord = await discordGranting(ABOUT_TO_EXPIRE_SECONDS);
        const oauth = discord.client();
        await oauth.exchange('the-code');

        await oauth.as(USER.id).get('/users/@me/guilds');

        expect(discord.acceptedRefreshes).toBe(1);
        expect(bearerOf(discord.requests, '/users/@me/guilds')).toEqual(['Bearer access-1']);
    });

    it.each(['invalid_grant', 'invalid_request'] as const)(
        'uses the tokens another process saved when it loses a refresh race and Discord answers %s',
        async (answer) => {
            const discord = await discordGranting(ABOUT_TO_EXPIRE_SECONDS);
            discord.usedRefreshTokenAnswer = answer;
            const [first, second] = [discord.client(), discord.client()];
            await first.exchange('the-code');

            await Promise.all([
                first.as(USER.id).get('/users/@me/guilds'),
                second.as(USER.id).get('/users/@me/guilds')
            ]);

            expect(discord.acceptedRefreshes).toBe(1);
            expect(bearerOf(discord.requests, '/users/@me/guilds')).toEqual(['Bearer access-1', 'Bearer access-1']);
        }
    );

    it('keeps reading a slow store until it has the tokens another process saved', async () => {
        const discord = await discordGranting(ABOUT_TO_EXPIRE_SECONDS);
        const slow: TokenStore = {
            get: (userId) => discord.store.get(userId),
            set: async (userId, sealed) => {
                await delay(SAVE_SLOWER_THAN_ONE_REREAD_MS);
                discord.store.set(userId, sealed);
            },
            delete: (userId) => discord.store.delete(userId)
        };
        const [first, second] = [discord.client(slow), discord.client(slow)];
        await first.exchange('the-code');

        await Promise.all([first.as(USER.id).get('/users/@me/guilds'), second.as(USER.id).get('/users/@me/guilds')]);

        expect(bearerOf(discord.requests, '/users/@me/guilds')).toEqual(['Bearer access-1', 'Bearer access-1']);
    });

    it('refreshes once for two calls from one client', async () => {
        const discord = await discordGranting(ABOUT_TO_EXPIRE_SECONDS);
        const oauth = discord.client();
        await oauth.exchange('the-code');
        discord.nextGrantLastsSeconds = WEEK_SECONDS;

        await Promise.all([oauth.as(USER.id).get('/users/@me/guilds'), oauth.as(USER.id).get('/users/@me/guilds')]);

        expect(discord.requests.filter((request) => request.body.includes('grant_type=refresh_token'))).toHaveLength(1);
    });

    async function callWaitingOnItsRefresh(): Promise<{
        discord: Discord;
        oauth: ReturnType<Discord['client']>;
        call: Promise<unknown>;
        answerTheRefresh: () => void;
    }> {
        const discord = await discordGranting(ABOUT_TO_EXPIRE_SECONDS);
        const oauth = discord.client();
        await oauth.exchange('the-code');
        const held = Promise.withResolvers<undefined>();
        discord.answersRefreshesAfter = held.promise;

        const call = oauth.as(USER.id).get('/users/@me/guilds');
        await vi.waitFor(() => {
            expect(discord.requests.at(-1)?.body).toContain('grant_type=refresh_token');
        });
        return { discord, oauth, call, answerTheRefresh: () => held.resolve(undefined) };
    }

    it('deletes the tokens when forget() is called during a refresh', async () => {
        const { discord, oauth, call, answerTheRefresh } = await callWaitingOnItsRefresh();

        const forgotten = oauth.forget(USER.id);
        answerTheRefresh();
        await Promise.all([call, forgotten]);

        expect(discord.store.size).toBe(0);
    });

    it("doesn't save a refresh after another process logged the user out", async () => {
        const { discord, call, answerTheRefresh } = await callWaitingOnItsRefresh();
        const anotherProcess = discord.client();

        await anotherProcess.forget(USER.id);
        answerTheRefresh();

        await expect(call).rejects.toMatchObject({ code: SeedcordErrorCode.PluginOAuthLoginNeeded });
        expect(discord.store.size).toBe(0);
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

    it('reports whether the application has the callback under Redirects', async () => {
        const application = { redirect_uris: ['https://other.test/callback'] };
        const discord = await fakeDiscord(() => ({ json: application }));
        const oauth = new OAuthClient({
            rest: new REST({ api: discord.api }).setToken('bot-token'),
            store: new Map(),
            clientId: APP_ID,
            clientSecret: CLIENT_SECRET,
            baseUrl: 'https://bot.test/'
        });

        expect(await oauth.isRedirectListed()).toBe(false);

        application.redirect_uris.push(oauth.redirectUri);
        expect(await oauth.isRedirectListed()).toBe(true);
    });
});

describe('OAuthClient scopes', () => {
    const LOGIN_NEEDED = { code: SeedcordErrorCode.PluginOAuthLoginNeeded };

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
        const discord = await discordGranting(ABOUT_TO_EXPIRE_SECONDS);
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

    it('throws for a user whose login is older than a scope in scopes, without calling Discord', async () => {
        const discord = await discordGranting(ABOUT_TO_EXPIRE_SECONDS, 'identify');
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

    it('throws when a typed call gets a 401, and keeps the record', async () => {
        const discord = await discordGranting(WEEK_SECONDS);
        const oauth = discord.client();
        await oauth.exchange('the-code');
        discord.deadAccessTokens.add('access-0');

        await expect(oauth.as(USER.id).guilds()).rejects.toMatchObject(LOGIN_NEEDED);
        expect(discord.store.size).toBe(1);
    });

    // a client that's one refresh behind. another process refreshed the tokens, and this client's first
    // read still gets the old record with the access token that Discord already ended
    async function clientBehindARefresh(
        scopes = { stale: 'identify guilds', saved: 'identify guilds' }
    ): Promise<{ discord: Discord; oauth: ReturnType<Discord['client']> }> {
        const discord = await discordGranting(WEEK_SECONDS, scopes.stale);
        await discord.client().exchange('the-code');
        const stale = discord.store.get(USER.id);
        discord.nextGrantScope = scopes.saved;
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

    it("doesn't retry a 401 when the user logged in again without the extra scope", async () => {
        const { discord, oauth } = await clientBehindARefresh({
            stale: 'identify guilds connections',
            saved: 'identify guilds'
        });

        expect(await oauth.as(USER.id).connections()).toBeUndefined();
        expect(bearerOf(discord.requests, '/users/@me/connections')).toEqual(['Bearer access-0']);
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
            if (route === `/guilds/after-removal/members/${USER.id}`) {
                return { status: 403, json: { message: 'Invalid OAuth2 access token', code: 50_025 } };
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

    it("throws that the user has to log in again when Discord refuses their token in a join's body", async () => {
        const { calls } = await loggedIn();

        await expect(calls.joinGuild('after-removal')).rejects.toMatchObject({
            code: SeedcordErrorCode.PluginOAuthLoginNeeded
        });
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
    const GUILD = { id: '42', name: 'seedcord', roles: [{ permissions: '8', tags: { bot_id: APP_ID } }] };
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
            permissions: 8n,
            webhook: WEBHOOK
        });
    });
});
