import { createHash } from 'node:crypto';

import { REST } from '@discordjs/rest';
import { describe, expect, it } from 'vite-plus/test';

import { AuthorizationFlow } from '#src/AuthorizationFlow';
import { MountedPath } from '#src/MountedPath';
import { OAuthClient } from '#src/OAuthClient';

import { fakeDiscord } from './fakeDiscord';

import type { FlowOutcome } from '#src/AuthorizationFlow';
import type { SeenRequest } from './fakeDiscord';

const USER = { id: '111', username: 'dhruv' };
const ISSUER = 'https://discord.com';

interface Flow {
    fetch(url: string, init?: RequestInit): Promise<Response | undefined>;
    // what the flow passed to its respond callback, in order
    outcomes: FlowOutcome[];
    tokenRequests(): SeenRequest[];
}

// a flow at `base`, against a discord that grants every code except 'refused'
async function flowAt(base: string, pkce = true): Promise<Flow> {
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
            scopes: []
        }),
        login: new MountedPath(baseUrl, 'oauth/login'),
        callback,
        pkce
    });

    const outcomes: FlowOutcome[] = [];
    return {
        outcomes,
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
        expect(cookie).toContain(authorize.get('state'));
        expect(cookieAttributes).toEqual(['HttpOnly', 'SameSite=Lax', 'Path=/oauth/', 'Max-Age=600', 'Secure']);
    });

    it('gives every visitor a different state', async () => {
        const flow = await flowAt(BASE);

        const first = await start(flow, `${BASE}oauth/login`);
        const second = await start(flow, `${BASE}oauth/login`);

        expect(first.authorize.get('state')).not.toBe(second.authorize.get('state'));
    });

    it("doesn't send a challenge when PKCE is off", async () => {
        const flow = await flowAt(BASE, false);

        const { authorize } = await start(flow, `${BASE}oauth/login`);

        expect(authorize.has('code_challenge')).toBe(false);
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
