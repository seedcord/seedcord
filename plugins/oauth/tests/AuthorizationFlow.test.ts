import { createHash } from 'node:crypto';

import { REST } from '@discordjs/rest';
import { describe, expect, it } from 'vite-plus/test';

import { OAuthClient } from '#src/OAuthClient';

import { fakeDiscord, WEEK_SECONDS } from './fakeDiscord';

import type { LoginOutcome } from '#src/LoginOutcome';
import type { OAuthClientOptions } from '#src/OAuthClientOptions';
import type { OAuthScope } from '#src/UserCalls';
import type { SeenRequest } from './fakeDiscord';

const USER = { id: '111', username: 'dhruv' };
const ISSUER = 'https://discord.com';

// every scope except the one that the clients here list in extraScopes
type EveryLoginScope = Exclude<OAuthScope, 'connections'>;

interface Flow {
    fetch(url: string, init?: RequestInit): Promise<Response | undefined>;
    loginUrl: OAuthClient<EveryLoginScope, 'connections'>['loginUrl'];
    outcomes: LoginOutcome[];
    tokenRequests(): SeenRequest[];
}

// a client at `base`, against a discord that grants every code except 'refused'
async function flowAt(
    base: string,
    scopes: EveryLoginScope[] = [],
    routes?: OAuthClientOptions['routes']
): Promise<Flow> {
    const discord = await fakeDiscord(({ route, body }) => {
        if (route !== '/oauth2/token') return { json: { user: USER, scopes: ['identify'] } };
        if (new URLSearchParams(body).get('code') === 'refused')
            return { status: 400, json: { error: 'invalid_grant' } };
        return {
            json: {
                token_type: 'Bearer',
                access_token: 'a',
                refresh_token: 'r',
                expires_in: WEEK_SECONDS,
                scope: 'identify'
            }
        };
    });
    const flow = new OAuthClient({
        rest: new REST({ api: discord.api }),
        store: new Map(),
        clientId: '1564002376115949650',
        clientSecret: 'client-secret',
        baseUrl: base,
        routes,
        scopes,
        extraScopes: ['connections']
    });

    const outcomes: LoginOutcome[] = [];
    return {
        outcomes,
        loginUrl: (link) => flow.loginUrl(link),
        tokenRequests: () => discord.requests.filter((request) => request.route === '/oauth2/token'),
        fetch: async (url, init) =>
            flow.fetch(new Request(url, init), (outcome) => {
                outcomes.push(outcome);
                return new Response(`page for ${outcome.kind}`);
            })
    };
}

interface Started {
    // the name=value pair a browser would send back
    cookie: string;
    cookieAttributes: string[];
    authorize: URLSearchParams;
    response: Response;
}

async function start(flow: Flow, loginUrl: string): Promise<Started> {
    const response = await flow.fetch(loginUrl);
    if (!response) throw new Error('the login route passed the request on');
    const [cookie = '', ...cookieAttributes] = (response.headers.get('set-cookie') ?? '').split('; ');
    const authorize = new URL(response.headers.get('location') ?? '').searchParams;
    return { cookie, cookieAttributes, authorize, response };
}

// the cookie a visitor could send after editing what theirs holds
function editedCookie(state: string, holds: Record<string, unknown>): string {
    return `__Host-seedcord_oauth_${state}=${Buffer.from(JSON.stringify(holds)).toString('base64url')}`;
}

function callbackUrl(base: string, query: Record<string, string>): string {
    return `${base}oauth/callback?${new URLSearchParams(query).toString()}`;
}

const BASE = 'https://bot.test/';

describe('AuthorizationFlow login route', () => {
    it('redirects to Discord with a state, a PKCE challenge, and a cookie only the browser sends back', async () => {
        const flow = await flowAt(BASE);

        const { response, authorize, cookie, cookieAttributes } = await start(flow, `${BASE}oauth/login`);

        expect(response.status).toBe(302);
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(authorize.get('redirect_uri')).toBe('https://bot.test/oauth/callback');
        expect(authorize.get('code_challenge_method')).toBe('S256');
        // only bot.test itself can set a __Host- cookie, and a browser takes one only with Path=/ and Secure
        expect(cookie.startsWith(`__Host-seedcord_oauth_${authorize.get('state') ?? ''}=`)).toBe(true);
        expect(cookieAttributes).toEqual(['HttpOnly', 'SameSite=Lax', 'Max-Age=600', 'Path=/', 'Secure']);
    });

    it('gives every visitor a different state', async () => {
        const flow = await flowAt(BASE);

        const first = await start(flow, `${BASE}oauth/login`);
        const second = await start(flow, `${BASE}oauth/login`);

        expect(first.authorize.get('state')).not.toBe(second.authorize.get('state'));
    });

    it("doesn't send a challenge with role_connections.write, which Discord refuses it with", async () => {
        const flow = await flowAt(BASE, ['role_connections.write']);

        const { authorize } = await start(flow, `${BASE}oauth/login`);

        expect(authorize.get('scope')).toBe('identify role_connections.write');
        expect(authorize.has('code_challenge')).toBe(false);
    });

    it('adds an extra scope that the login link lists', async () => {
        const flow = await flowAt(BASE, ['guilds']);

        const { authorize } = await start(flow, flow.loginUrl({ scopes: ['connections'] }));

        expect(authorize.get('scope')).toBe('identify guilds connections');
    });

    it.each([
        ['the link lists it twice', [], 'connections+connections', 'identify connections'],
        ['every login already requests it', ['guilds'], 'guilds+connections', 'identify guilds connections']
    ] as const)('requests a scope once when %s', async (_when, scopes, listed, requested) => {
        const flow = await flowAt(BASE, [...scopes]);

        const { authorize } = await start(flow, `${BASE}oauth/login?scopes=${listed}`);

        expect(authorize.get('scope')).toBe(requested);
    });

    it('reports a link with a scope outside extraScopes, without sending the visitor to Discord', async () => {
        const flow = await flowAt(BASE);

        const response = await flow.fetch(`${BASE}oauth/login?scopes=guilds.join+connections`);

        expect(flow.outcomes).toEqual([{ kind: 'unlisted', scopes: ['guilds.join'] }]);
        expect(await response?.text()).toBe('page for unlisted');
        expect(response?.headers.has('set-cookie')).toBe(false);
    });

    it('passes on a request for any other path or method', async () => {
        const flow = await flowAt(BASE);

        expect(await flow.fetch(`${BASE}oauth/other`)).toBeUndefined();
        expect(await flow.fetch(`${BASE}oauth/callback`, { method: 'POST' })).toBeUndefined();
        expect(flow.outcomes).toEqual([]);
    });
});

describe('AuthorizationFlow callback route', () => {
    it('logs the visitor in and sends the verifier that matches the challenge', async () => {
        const flow = await flowAt(BASE);
        const { cookie, authorize } = await start(flow, `${BASE}oauth/login`);
        const state = authorize.get('state') ?? '';

        const response = await flow.fetch(callbackUrl(BASE, { code: 'the-code', state, iss: ISSUER }), {
            headers: { cookie }
        });

        expect(flow.outcomes).toEqual([{ kind: 'login', login: { user: USER, scopes: ['identify'] } }]);
        expect(await response?.text()).toBe('page for login');
        expect(response?.headers.get('cache-control')).toBe('no-store');
        expect(response?.headers.get('set-cookie')).toContain('Max-Age=0');

        const verifier = new URLSearchParams(flow.tokenRequests()[0]?.body).get('code_verifier') ?? '';
        expect(createHash('sha256').update(verifier).digest('base64url')).toBe(authorize.get('code_challenge'));
    });

    it.each([
        ['a state that differs from the cookie', (state: string) => ({ code: 'c', state: `${state}x`, iss: ISSUER })],
        ['another issuer', (state: string) => ({ code: 'c', state, iss: 'https://evil.test' })],
        ['a missing issuer', (state: string) => ({ code: 'c', state })],
        ['a missing code', (state: string) => ({ state, iss: ISSUER })]
    ])('refuses %s without calling Discord', async (_name, query) => {
        const flow = await flowAt(BASE);
        const { cookie, authorize } = await start(flow, `${BASE}oauth/login`);

        await flow.fetch(callbackUrl(BASE, query(authorize.get('state') ?? '')), { headers: { cookie } });

        expect(flow.outcomes).toEqual([{ kind: 'invalid' }]);
        expect(flow.tokenRequests()).toEqual([]);
    });

    it('refuses a callback from a browser that never started a login', async () => {
        const flow = await flowAt(BASE);
        const { authorize } = await start(flow, `${BASE}oauth/login`);
        const state = authorize.get('state') ?? '';

        await flow.fetch(callbackUrl(BASE, { code: 'c', state, iss: ISSUER }));

        expect(flow.outcomes).toEqual([{ kind: 'invalid' }]);
        expect(flow.tokenRequests()).toEqual([]);
    });

    it("reports the visitor's refusal with Discord's error", async () => {
        const flow = await flowAt(BASE);
        const { cookie, authorize } = await start(flow, `${BASE}oauth/login`);
        const state = authorize.get('state') ?? '';

        await flow.fetch(callbackUrl(BASE, { error: 'access_denied', state, iss: ISSUER }), { headers: { cookie } });

        expect(flow.outcomes).toEqual([{ kind: 'denied', error: 'access_denied' }]);
        expect(flow.tokenRequests()).toEqual([]);
    });

    it('reports a code that Discord refuses as invalid', async () => {
        const flow = await flowAt(BASE);
        const { cookie, authorize } = await start(flow, `${BASE}oauth/login`);
        const state = authorize.get('state') ?? '';

        await flow.fetch(callbackUrl(BASE, { code: 'refused', state, iss: ISSUER }), { headers: { cookie } });

        expect(flow.outcomes).toEqual([{ kind: 'invalid' }]);
    });

    it('finishes a login that started before another tab started a second one', async () => {
        const flow = await flowAt(BASE);
        const first = await start(flow, `${BASE}oauth/login`);
        const second = await start(flow, `${BASE}oauth/login`);
        const state = first.authorize.get('state') ?? '';

        await flow.fetch(callbackUrl(BASE, { code: 'the-code', state, iss: ISSUER }), {
            headers: { cookie: `${first.cookie}; ${second.cookie}` }
        });

        expect(flow.outcomes).toMatchObject([{ kind: 'login' }]);
    });

    it("refuses a visitor's own cookie with a verifier that isn't text, without calling Discord", async () => {
        const flow = await flowAt(BASE);
        const { authorize } = await start(flow, `${BASE}oauth/login`);
        const state = authorize.get('state') ?? '';

        await flow.fetch(callbackUrl(BASE, { code: 'the-code', state, iss: ISSUER }), {
            headers: { cookie: editedCookie(state, { verifier: 123 }) }
        });

        expect(flow.outcomes).toEqual([{ kind: 'invalid' }]);
        expect(flow.tokenRequests()).toEqual([]);
    });

    it("refuses a state that could add its own attributes to the cookie's name", async () => {
        const flow = await flowAt(BASE);
        const state = 'x; Domain=evil.test';

        const response = await flow.fetch(callbackUrl(BASE, { code: 'c', state, iss: ISSUER }), {
            headers: { cookie: editedCookie(state, {}) }
        });

        expect(flow.outcomes).toEqual([{ kind: 'invalid' }]);
        expect(response?.headers.has('set-cookie')).toBe(false);
    });
});

describe('AuthorizationFlow adding the bot', () => {
    it("passes the link's permissions and server on to Discord", async () => {
        const flow = await flowAt(BASE);

        const link = flow.loginUrl({ permissions: 8n, guildId: '42', disableGuildSelect: true, integrationType: 0 });
        const { authorize } = await start(flow, link);

        expect(Object.fromEntries(authorize)).toMatchObject({
            permissions: '8',
            guild_id: '42',
            disable_guild_select: 'true',
            integration_type: '0'
        });
    });

    it("doesn't pass on a permissions value that isn't a number", async () => {
        const flow = await flowAt(BASE);

        const { authorize } = await start(flow, `${BASE}oauth/login?permissions=all&guildId=mine`);

        expect(authorize.has('permissions')).toBe(false);
        expect(authorize.has('guild_id')).toBe(false);
    });

    it('reports the permissions that the visitor approved', async () => {
        const flow = await flowAt(BASE);
        const { cookie, authorize } = await start(flow, `${BASE}oauth/login`);
        const state = authorize.get('state') ?? '';

        await flow.fetch(callbackUrl(BASE, { code: 'c', state, iss: ISSUER, guild_id: '42', permissions: '8' }), {
            headers: { cookie }
        });

        expect(flow.outcomes[0]).toMatchObject({ kind: 'login', login: { permissions: '8' } });
    });
});

describe('AuthorizationFlow returnTo', () => {
    async function returnToAfterLogin(returnTo: string): Promise<string | undefined> {
        const flow = await flowAt(BASE);
        const { cookie, authorize } = await start(flow, flow.loginUrl({ returnTo }));
        const state = authorize.get('state') ?? '';
        await flow.fetch(callbackUrl(BASE, { code: 'the-code', state, iss: ISSUER }), { headers: { cookie } });

        const [outcome] = flow.outcomes;
        return outcome?.kind === 'login' ? outcome.login.returnTo : 'the login failed';
    }

    it.each([
        ['another site', 'https://evil.test/'],
        ['a number', 5]
    ])("doesn't pass on %s that a visitor wrote into their own cookie", async (_name, returnTo) => {
        const flow = await flowAt(BASE);
        const { authorize } = await start(flow, `${BASE}oauth/login`);
        const state = authorize.get('state') ?? '';

        await flow.fetch(callbackUrl(BASE, { code: 'the-code', state, iss: ISSUER }), {
            headers: { cookie: editedCookie(state, { returnTo }) }
        });

        expect(flow.outcomes).toMatchObject([{ kind: 'login', login: { returnTo: undefined } }]);
    });

    it("hands the login link's path to the callback", async () => {
        expect(await returnToAfterLogin('/dashboard/servers?tab=roles')).toBe('/dashboard/servers?tab=roles');
    });

    it.each(['https://evil.test/', '//evil.test/', String.raw`/\evil.test/`, 'dashboard'])(
        "doesn't pass on %s, which is not a path on this site",
        async (returnTo) => {
            expect(await returnToAfterLogin(returnTo)).toBeUndefined();
        }
    );
});

describe('AuthorizationFlow under a path', () => {
    const MOUNTED = 'http://localhost:3000/app/';

    it('answers with and without the prefix, and scopes the cookie to the public path', async () => {
        const flow = await flowAt(MOUNTED);

        const prefixed = await start(flow, `${MOUNTED}oauth/login`);
        const stripped = await start(flow, 'http://localhost:3000/oauth/login');

        expect(prefixed.authorize.get('redirect_uri')).toBe('http://localhost:3000/app/oauth/callback');
        expect(stripped.authorize.get('redirect_uri')).toBe('http://localhost:3000/app/oauth/callback');
        // a browser ignores a Secure cookie that arrives over plain http
        expect(prefixed.cookie.startsWith('seedcord_oauth_')).toBe(true);
        expect(prefixed.cookieAttributes).toEqual(['HttpOnly', 'SameSite=Lax', 'Max-Age=600', 'Path=/app/oauth/']);
    });

    it('reads a base without its last slash and a route with a first slash the same way', async () => {
        const flow = await flowAt('http://localhost:3000/app', [], { callback: '/oauth/callback' });

        const { authorize } = await start(flow, `${MOUNTED}oauth/login`);

        expect(authorize.get('redirect_uri')).toBe('http://localhost:3000/app/oauth/callback');
    });
});

describe('AuthorizationFlow on other routes', () => {
    const ROUTES = { login: 'linked-roles/verify', callback: 'linked-roles/callback' };

    it('serves the login and the callback at the paths in routes', async () => {
        const flow = await flowAt(BASE, [], ROUTES);
        const { cookie, authorize } = await start(flow, flow.loginUrl());
        const state = authorize.get('state') ?? '';

        const query = new URLSearchParams({ code: 'c', state, iss: ISSUER }).toString();
        await flow.fetch(`${BASE}linked-roles/callback?${query}`, { headers: { cookie } });

        expect(flow.loginUrl()).toBe('https://bot.test/linked-roles/verify');
        expect(authorize.get('redirect_uri')).toBe('https://bot.test/linked-roles/callback');
        expect(flow.outcomes).toMatchObject([{ kind: 'login' }]);
    });

    it('passes on a request for the routes it would serve without the option', async () => {
        const flow = await flowAt(BASE, [], ROUTES);

        expect(await flow.fetch(`${BASE}oauth/login`)).toBeUndefined();
        expect(await flow.fetch(`${BASE}oauth/callback`)).toBeUndefined();
    });
});
