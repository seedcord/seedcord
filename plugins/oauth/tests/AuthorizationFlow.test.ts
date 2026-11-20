import { createHash } from 'node:crypto';

import { REST } from '@discordjs/rest';
import { describe, expect, it } from 'vite-plus/test';

import { AuthorizationFlow } from '#src/AuthorizationFlow';
import { MountedPath } from '#src/MountedPath';
import { OAuthClient } from '#src/OAuthClient';

import { fakeDiscord } from './fakeDiscord';

import type { FlowOutcome } from '#src/AuthorizationFlow';
import type { OAuthScope } from '#src/UserCalls';
import type { SeenRequest } from './fakeDiscord';

const USER = { id: '111', username: 'dhruv' };
const ISSUER = 'https://discord.com';

interface Flow {
    fetch(url: string, init?: RequestInit): Promise<Response | undefined>;
    loginUrl: AuthorizationFlow['loginUrl'];
    outcomes: FlowOutcome[];
    tokenRequests(): SeenRequest[];
}

// a flow at `base`, against a discord that grants every code except 'refused'
async function flowAt(base: string, scopes: OAuthScope[] = []): Promise<Flow> {
    const extraScopes: OAuthScope[] = ['connections'];
    const discord = await fakeDiscord(({ route, body }) => {
        if (route !== '/oauth2/token') return { json: { user: USER, scopes: ['identify'] } };
        if (new URLSearchParams(body).get('code') === 'refused')
            return { status: 400, json: { error: 'invalid_grant' } };
        return {
            json: {
                token_type: 'Bearer',
                access_token: 'a',
                refresh_token: 'r',
                expires_in: 604_800,
                scope: 'identify'
            }
        };
    });
    const baseUrl = new URL(base);
    const callback = new MountedPath(baseUrl, 'oauth/callback');
    const flow = new AuthorizationFlow({
        client: new OAuthClient({
            rest: new REST({ api: discord.api }),
            store: new Map(),
            clientId: '1564002376115949650',
            clientSecret: 'client-secret',
            redirectUri: callback.url,
            scopes,
            extraScopes
        }),
        login: new MountedPath(baseUrl, 'oauth/login'),
        callback,
        scopes,
        extraScopes
    });

    const outcomes: FlowOutcome[] = [];
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

function stateIn(cookie: string): unknown {
    const value = cookie.slice(cookie.indexOf('=') + 1);
    return (JSON.parse(Buffer.from(value, 'base64url').toString()) as { state: unknown }).state;
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
        expect(stateIn(cookie)).toBe(authorize.get('state'));
        expect(cookieAttributes).toEqual(['HttpOnly', 'SameSite=Lax', 'Path=/oauth/', 'Max-Age=600', 'Secure']);
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

    it('requests a scope once when the login link lists it twice', async () => {
        const flow = await flowAt(BASE);

        const { authorize } = await start(flow, `${BASE}oauth/login?scopes=connections+connections`);

        expect(authorize.get('scope')).toBe('identify connections');
    });

    it('answers 400 to a link with a scope outside extraScopes', async () => {
        const flow = await flowAt(BASE);

        const response = await flow.fetch(`${BASE}oauth/login?scopes=guilds.join`);

        expect(response?.status).toBe(400);
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

        expect(flow.outcomes[0]).toMatchObject({ kind: 'login', permissions: '8' });
    });
});

describe('AuthorizationFlow returnTo', () => {
    async function returnToAfterLogin(returnTo: string): Promise<string | undefined> {
        const flow = await flowAt(BASE);
        const { cookie, authorize } = await start(flow, flow.loginUrl({ returnTo }));
        const state = authorize.get('state') ?? '';
        await flow.fetch(callbackUrl(BASE, { code: 'the-code', state, iss: ISSUER }), { headers: { cookie } });

        const [outcome] = flow.outcomes;
        return outcome?.kind === 'login' ? outcome.returnTo : 'the login failed';
    }

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
        expect(prefixed.cookieAttributes).toEqual(['HttpOnly', 'SameSite=Lax', 'Path=/app/oauth/', 'Max-Age=600']);
    });
});
