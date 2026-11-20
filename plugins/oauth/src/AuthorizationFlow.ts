import { makeURLSearchParams } from '@discordjs/rest';
import { compact } from 'es-toolkit';

import { fromBase64Url, toBase64Url } from './base64';

import type { AuthorizeUrlOptions, BotLinkOptions, InstallLinkOptions, LoginLink } from './AuthorizeUrlOptions';
import type { LoginOutcome, OAuthLogin } from './LoginOutcome';
import type { MountedPath } from './MountedPath';
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

// the parts of an OAuthClient that the flow calls
interface LoginSteps {
    readonly scopes: readonly OAuthScope[];
    readonly extraScopes: ReadonlySet<OAuthScope>;
    // every scope is allowed here because the flow only finds out a link's scopes when a request comes in
    authorizeUrl(options: AuthorizeUrlOptions<OAuthScope, OAuthScope>): string;
    exchange(code: string, codeVerifier?: string): Promise<OAuthLogin | undefined>;
}

interface FlowOptions {
    client: LoginSteps;
    login: MountedPath;
    callback: MountedPath;
}

interface Pending {
    state: string;
    verifier: string | undefined;
    returnTo: string | undefined;
}

const ISSUER = 'https://discord.com';
const COOKIE = 'seedcord_oauth';
// how long a visitor has to get through discord's consent screen. 10 minutes is a guess
const COOKIE_SECONDS = 10 * 60;
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

// returnTo comes from the url, and anyone can write a link. without this check a real login could end
// on someone else's site. '//evil.test' and '/\evil.test' both look like paths, but a browser reads them
// as another site. parsing against a fake origin catches those because the origin changes
function ownPath(returnTo: string | null | undefined): string | undefined {
    if (!returnTo?.startsWith('/')) return undefined;
    const origin = 'https://own.invalid';
    return URL.parse(returnTo, origin)?.origin === origin ? returnTo : undefined;
}

// reads back the options that loginUrl() put in the query. a visitor can edit the url, and that's why
// only digits get through
function installOptionsIn(query: URLSearchParams): BotLinkOptions & InstallLinkOptions {
    const digits = (name: string): string | undefined => {
        const value = query.get(name);
        return value !== null && /^\d+$/u.test(value) ? value : undefined;
    };
    const integrationType = digits('integrationType');
    return {
        permissions: digits('permissions'),
        guildId: digits('guildId'),
        disableGuildSelect: query.get('disableGuildSelect') === 'true' ? true : undefined,
        integrationType: integrationType === undefined ? undefined : Number(integrationType)
    };
}

export class AuthorizationFlow {
    constructor(private readonly options: FlowOptions) {}

    public async fetch(
        request: Request,
        respond: (outcome: LoginOutcome) => Promisable<Response>
    ): Promise<Response | undefined> {
        if (request.method !== 'GET') return undefined;
        const url = new URL(request.url);
        if (this.options.login.matches(url.pathname)) return this.begin(url.searchParams);
        if (!this.options.callback.matches(url.pathname)) return undefined;

        const response = await respond(await this.finish(request, url.searchParams));
        return this.withHeaders(response, this.cookie('', 0));
    }

    public loginUrl({ scopes = [], ...link }: LoginLink = {}): string {
        const url = new URL(this.options.login.url);
        url.search = makeURLSearchParams({
            scopes: scopes.length > 0 ? scopes.join(' ') : undefined,
            ...link
        }).toString();
        return url.href;
    }

    private async begin(query: URLSearchParams): Promise<Response> {
        const { client } = this.options;
        const asked = new Set(compact(query.get('scopes')?.split(' ') ?? []));
        const extra = client.extraScopes.intersection(asked);
        if (extra.size < asked.size) {
            return new Response('This login link requests a scope that the bot does not list in extraScopes.', {
                status: BAD_REQUEST
            });
        }

        // discord refuses a PKCE challenge together with this scope
        const pkce = !client.scopes.includes('role_connections.write') && !extra.has('role_connections.write');
        const pending: Pending = {
            state: randomToken(),
            verifier: pkce ? randomToken() : undefined,
            returnTo: ownPath(query.get('returnTo'))
        };

        const location = client.authorizeUrl({
            ...installOptionsIn(query),
            state: pending.state,
            codeChallenge: pending.verifier === undefined ? undefined : await challengeOf(pending.verifier),
            scopes: [...extra]
        });
        const cookie = this.cookie(toBase64Url(encoder.encode(JSON.stringify(pending))), COOKIE_SECONDS);
        return this.withHeaders(new Response(null, { status: FOUND, headers: { location } }), cookie);
    }

    private async finish(request: Request, query: URLSearchParams): Promise<LoginOutcome> {
        const pending = this.pendingOf(request);
        if (!pending) return { kind: 'invalid' };
        if (query.get('state') !== pending.state || query.get('iss') !== ISSUER) return { kind: 'invalid' };

        const error = query.get('error');
        if (error !== null) return { kind: 'denied', error };

        const code = query.get('code');
        const login = code === null ? undefined : await this.options.client.exchange(code, pending.verifier);
        if (!login) return { kind: 'invalid' };
        // checked again here because a visitor can edit their own cookie
        const returnTo = ownPath(pending.returnTo);
        return { kind: 'login', login: { ...login, returnTo, permissions: query.get('permissions') ?? undefined } };
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

    // HttpOnly so page scripts can't read it. it has to be Lax because Strict wouldn't send it when
    // discord redirects back. the path comes from the public url since that's the only one the browser has
    private cookie(value: string, maxAge: number): string {
        const { url } = this.options.callback;
        const secure = url.protocol === 'https:' ? '; Secure' : '';
        return `${COOKIE}=${value}; HttpOnly; SameSite=Lax; Path=${new URL('.', url).pathname}; Max-Age=${maxAge}${secure}`;
    }

    private withHeaders(response: Response, cookie: string): Response {
        // copied because Response.redirect() gives headers that can't be changed
        const copy = new Response(response.body, response);
        copy.headers.append('set-cookie', cookie);
        // these urls have the code and the state in them, and a cache shouldn't keep either
        copy.headers.set('cache-control', 'no-store');
        return copy;
    }
}
