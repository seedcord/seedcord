import { fromBase64Url, toBase64Url } from './base64';

import type { MountedPath } from './MountedPath';
import type { OAuthClient, OAuthLogin } from './OAuthClient';
import type { OAuthScope } from './UserCalls';
import type { Promisable } from 'type-fest';

// the browser half of a login. the login route sends the visitor to discord, and discord sends them back
// to the callback route.
//
// this callback part is dangerous. anyone can make someone else's browser open /callback?code=..., and
// if the bot just accepted that, the other person would get logged in as the attacker. that's what
// `state` is for. the login route makes a random value, puts it in the link to discord, and also saves
// it in a cookie. discord sends it back in the callback's url. when the url and the cookie don't match,
// this browser didn't start that login, and finish() answers `invalid`.
//
// PKCE does the same for the code. the cookie also has a second random value, the verifier, and the link
// to discord only has its hash. discord doesn't exchange the code unless the verifier comes with it.
// a code that someone copied out of a url is useless to them without the cookie.
//
// `iss` is discord's own address, which it adds to every callback. checking it mostly matters for an app
// with more than one login provider. it's just one comparison though, and RFC 9207 suggests to do it.

/**
 * How a visit to the callback route ended.
 *
 * - `login`: Discord accepted the code, and the user's tokens are saved. `returnTo` is the path that the login
 *   link asked to end on.
 * - `denied`: the visitor pressed cancel on Discord's consent screen, or Discord refused the request. `error` is Discord's
 *   reason, like `access_denied`.
 * - `invalid`: the callback can't be trusted or used. The link expired, the page was reloaded, or the
 *   request didn't come from a login this browser started.
 */
export type FlowOutcome =
    | { kind: 'login'; login: OAuthLogin; returnTo: string | undefined }
    | { kind: 'denied'; error: string }
    | { kind: 'invalid' };

interface FlowOptions {
    // typed for every scope because the flow reads the scopes of a login link at run time
    client: Pick<OAuthClient<OAuthScope, OAuthScope>, 'authorizeUrl' | 'exchange'>;
    login: MountedPath;
    callback: MountedPath;
    scopes: readonly OAuthScope[];
    extraScopes: readonly OAuthScope[];
}

export interface LoginLink {
    scopes?: readonly OAuthScope[] | undefined;
    returnTo?: string | undefined;
}

interface Pending {
    state: string;
    verifier?: string;
    returnTo?: string;
}

const ISSUER = 'https://discord.com';
const COOKIE = 'seedcord_oauth';
// how long a visitor has to get through discord's consent screen. 10 minutes is a guess
const COOKIE_SECONDS = 600;
const RANDOM_BYTES = 32;
const BAD_REQUEST = 400;
const FOUND = 302;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function randomToken(): string {
    return toBase64Url(crypto.getRandomValues(new Uint8Array(RANDOM_BYTES)));
}

async function challengeOf(verifier: string): Promise<string> {
    return toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier))));
}

function cookieOf(request: Request, name: string): string | undefined {
    const pair = request.headers
        .get('cookie')
        ?.split('; ')
        .find((part) => part.startsWith(`${name}=`));
    return pair?.slice(name.length + 1);
}

// a return address from the query could send the visitor to someone else's site after a real login.
// parsing it against a made-up origin shows whether it's only a path: '//evil.test' and '/\evil.test'
// both come out with another origin
function ownPath(returnTo: string | null): string | undefined {
    if (!returnTo?.startsWith('/')) return undefined;
    const origin = 'https://own.invalid';
    return URL.parse(returnTo, origin)?.origin === origin ? returnTo : undefined;
}

export class AuthorizationFlow {
    constructor(private readonly options: FlowOptions) {}

    public async fetch(
        request: Request,
        respond: (outcome: FlowOutcome) => Promisable<Response>
    ): Promise<Response | undefined> {
        if (request.method !== 'GET') return undefined;
        const url = new URL(request.url);
        if (this.options.login.matches(url.pathname)) return this.begin(url.searchParams);
        if (!this.options.callback.matches(url.pathname)) return undefined;

        const response = await respond(await this.finish(request, url.searchParams));
        return this.withHeaders(response, this.cookie('', 0));
    }

    public loginUrl({ scopes = [], returnTo }: LoginLink = {}): string {
        const url = new URL(this.options.login.url);
        if (scopes.length > 0) url.searchParams.set('scopes', scopes.join(' '));
        if (returnTo !== undefined) url.searchParams.set('returnTo', returnTo);
        return url.href;
    }

    private async begin(query: URLSearchParams): Promise<Response> {
        const asked = new Set(query.get('scopes')?.split(' ').filter(Boolean));
        const extra = this.options.extraScopes.filter((scope) => asked.has(scope));
        if (!asked.isSubsetOf(new Set<string>(extra))) {
            return new Response('This login link requests a scope that the bot does not list in extraScopes.', {
                status: BAD_REQUEST
            });
        }

        const pending: Pending = { state: randomToken() };
        // discord refuses a PKCE challenge together with this scope
        if (![...this.options.scopes, ...extra].includes('role_connections.write')) pending.verifier = randomToken();
        const returnTo = ownPath(query.get('returnTo'));
        if (returnTo !== undefined) pending.returnTo = returnTo;

        const location = this.options.client.authorizeUrl({
            state: pending.state,
            codeChallenge: pending.verifier === undefined ? undefined : await challengeOf(pending.verifier),
            scopes: extra
        });
        const cookie = this.cookie(toBase64Url(encoder.encode(JSON.stringify(pending))), COOKIE_SECONDS);
        return this.withHeaders(new Response(null, { status: FOUND, headers: { location } }), cookie);
    }

    private async finish(request: Request, query: URLSearchParams): Promise<FlowOutcome> {
        const pending = this.pendingOf(request);
        if (!pending) return { kind: 'invalid' };
        if (query.get('state') !== pending.state || query.get('iss') !== ISSUER) return { kind: 'invalid' };

        const error = query.get('error');
        if (error !== null) return { kind: 'denied', error };

        const code = query.get('code');
        const login = code === null ? undefined : await this.options.client.exchange(code, pending.verifier);
        return login ? { kind: 'login', login, returnTo: pending.returnTo } : { kind: 'invalid' };
    }

    private pendingOf(request: Request): Pending | undefined {
        const value = cookieOf(request, COOKIE);
        if (!value) return undefined;
        try {
            // justified: begin() is the only writer of this cookie. a visitor who edits it fails the state check
            return JSON.parse(decoder.decode(fromBase64Url(value))) as Pending;
        } catch {
            return undefined;
        }
    }

    // HttpOnly keeps page scripts from reading it. Lax still sends it on the redirect back from discord,
    // which Strict wouldn't. the path is the public one because the browser only has the public address
    private cookie(value: string, maxAge: number): string {
        const { url } = this.options.callback;
        const secure = url.protocol === 'https:' ? '; Secure' : '';
        return `${COOKIE}=${value}; HttpOnly; SameSite=Lax; Path=${new URL('.', url).pathname}; Max-Age=${maxAge}${secure}`;
    }

    private withHeaders(response: Response, cookie: string): Response {
        // a response from Response.redirect() has headers that can't be changed
        const copy = new Response(response.body, response);
        copy.headers.append('set-cookie', cookie);
        // the callback's url has the code in it, and the login's redirect has the state
        copy.headers.set('cache-control', 'no-store');
        return copy;
    }
}
