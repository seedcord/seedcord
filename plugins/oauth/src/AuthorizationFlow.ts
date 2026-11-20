import { toBase64Url } from './base64';

import type { MountedPath } from './MountedPath';
import type { OAuthClient, OAuthLogin } from './OAuthClient';
import type { Promisable } from 'type-fest';

// the browser half of a login: the redirect to discord and the callback that discord sends the visitor
// back to.
//
// this callback part is dangerous. anyone can open /callback?code=... in someone else's browser, and
// if the bot accepted it, that person would end up logged in as the attacker. the fix is `state`. the
// login route makes a random value, puts it in the link to discord, and also sets it as a cookie. discord
// hands the value back in the callback's url. the callback only counts when the two match because only
// the browser that started the login has the cookie.
//
// PKCE covers a stolen code the same way. the cookie also holds a second random value, the verifier, and
// the link only has its hash. discord refuses the code unless the exchange sends the verifier.
//
// `iss` is discord saying "this redirect came from me". discord sends it on every callback, and a
// callback with another issuer was meant for some other login provider.

/**
 * How a visit to the callback route ended.
 *
 * - `login`: Discord accepted the code, and the user's tokens are saved.
 * - `denied`: the visitor pressed cancel on Discord's consent screen, or Discord refused the request. `error` is Discord's
 *   reason, like `access_denied`.
 * - `invalid`: the callback can't be trusted or used. The link expired, the page was reloaded, or the
 *   request didn't come from a login this browser started.
 */
export type FlowOutcome =
    | { kind: 'login'; login: OAuthLogin }
    | { kind: 'denied'; error: string }
    | { kind: 'invalid' };

interface FlowOptions {
    client: Pick<OAuthClient, 'authorizeUrl' | 'exchange'>;
    login: MountedPath;
    callback: MountedPath;
    // discord refuses a PKCE challenge together with the role_connections.write scope
    pkce: boolean;
}

const ISSUER = 'https://discord.com';
const COOKIE = 'seedcord_oauth';
// how long a visitor has to get through discord's consent screen. 10 minutes is a guess
const COOKIE_SECONDS = 600;
const RANDOM_BYTES = 32;

function randomToken(): string {
    return toBase64Url(crypto.getRandomValues(new Uint8Array(RANDOM_BYTES)));
}

async function challengeOf(verifier: string): Promise<string> {
    return toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
}

function cookieOf(request: Request, name: string): string | undefined {
    const pair = request.headers
        .get('cookie')
        ?.split('; ')
        .find((part) => part.startsWith(`${name}=`));
    return pair?.slice(name.length + 1);
}

export class AuthorizationFlow {
    constructor(private readonly options: FlowOptions) {}

    // answers the login and callback routes, and resolves to undefined for every other request.
    // `respond` turns the callback's outcome into the page or redirect that the visitor gets
    public async fetch(
        request: Request,
        respond: (outcome: FlowOutcome) => Promisable<Response>
    ): Promise<Response | undefined> {
        if (request.method !== 'GET') return undefined;
        const url = new URL(request.url);
        if (this.options.login.matches(url.pathname)) return this.begin();
        if (!this.options.callback.matches(url.pathname)) return undefined;

        const response = await respond(await this.finish(request, url.searchParams));
        return this.withHeaders(response, this.cookie('', 0));
    }

    private async begin(): Promise<Response> {
        const state = randomToken();
        const verifier = this.options.pkce ? randomToken() : undefined;
        const location = this.options.client.authorizeUrl({
            state,
            codeChallenge: verifier === undefined ? undefined : await challengeOf(verifier)
        });
        const cookie = this.cookie(verifier === undefined ? state : `${state}.${verifier}`, COOKIE_SECONDS);
        return this.withHeaders(new Response(null, { status: 302, headers: { location } }), cookie);
    }

    private async finish(request: Request, query: URLSearchParams): Promise<FlowOutcome> {
        const [state, verifier] = cookieOf(request, COOKIE)?.split('.') ?? [];
        if (!state || query.get('state') !== state || query.get('iss') !== ISSUER) return { kind: 'invalid' };

        const error = query.get('error');
        if (error !== null) return { kind: 'denied', error };

        const code = query.get('code');
        const login = code === null ? undefined : await this.options.client.exchange(code, verifier);
        return login ? { kind: 'login', login } : { kind: 'invalid' };
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
