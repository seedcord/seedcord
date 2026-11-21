import { Buffer } from 'node:buffer';

import { makeURLSearchParams } from '@discordjs/rest';
import { isPlainObject } from '@seedcord/utils/internal';
import { OAuth2Routes } from 'discord-api-types/v10';
import { compact, difference, union } from 'es-toolkit';

import type { AnyAuthorizeUrlOptions, AnyLoginLink, BotLinkOptions, InstallLinkOptions } from './AuthorizeUrlOptions';
import type { FailedLogin, LoginOutcome, OAuthLogin } from './LoginOutcome';
import type { MountedPath } from './MountedPath';
import type { OAuthScope } from './UserCalls';
import type { UserTokens } from './UserTokens';
import type { Promisable } from 'type-fest';

// a login, from the link to discord to the tokens it ends with. the login route sends the visitor to
// discord, and discord sends them back to the callback route.
//
// this callback part is dangerous. anyone can make someone else's browser open /callback?code=..., and
// if the bot just accepted that, the other person would get logged in as the attacker. that's what
// `state` is for. the login route makes a random value, puts it in the link to discord, and also saves
// a cookie under it. discord sends it back in the callback's url. when the browser doesn't have the
// cookie for that value, this browser didn't start that login, and the callback answers `invalid`.
//
// PKCE does the same for the code. the cookie also has a second random value, the verifier, and the link
// to discord only has its hash. discord doesn't exchange the code unless the verifier comes with it.
// a code that someone copied out of a url is useless to them without the cookie.
//
// `iss` is discord's own address, which it adds to every callback. checking it mostly matters for an app
// with more than one login provider. it's just one comparison though, and RFC 9207 suggests to do it.

interface FlowOptions {
    tokens: UserTokens;
    clientId: string;
    scopes: readonly OAuthScope[];
    extraScopes: ReadonlySet<OAuthScope>;
    login: MountedPath;
    callback: MountedPath;
}

interface Pending {
    verifier: string | undefined;
    returnTo: string | undefined;
}

const ISSUER = 'https://discord.com';
const COOKIE = 'seedcord_oauth';
// how long a visitor has to get through discord's consent screen. 10 minutes is a guess
const COOKIE_SECONDS = 10 * 60;
const RANDOM_BYTES = 32;
// the shape of a randomToken(). the callback puts the url's `state` in a cookie's name, and a `state`
// of any other shape could add its own cookie attributes there
const RANDOM_TOKEN = /^[\w-]{43}$/u;
const FOUND = 302;

function randomToken(): string {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(RANDOM_BYTES))).toString('base64url');
}

async function challengeOf(verifier: string): Promise<string> {
    return Buffer.from(await crypto.subtle.digest('SHA-256', Buffer.from(verifier))).toString('base64url');
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
function ownPath(returnTo: string): string | undefined {
    if (!returnTo.startsWith('/')) return undefined;
    const origin = 'https://own.invalid';
    return URL.parse(returnTo, origin)?.origin === origin ? returnTo : undefined;
}

// a visitor can edit their own cookie. every field is checked here, the one place that reads it
function pendingIn(cookie: string | undefined): Pending | undefined {
    if (cookie === undefined) return undefined;
    let saved: unknown;
    try {
        saved = JSON.parse(Buffer.from(cookie, 'base64url').toString());
    } catch {
        return undefined;
    }
    if (!isPlainObject(saved)) return undefined;

    const { verifier, returnTo } = saved;
    if (verifier !== undefined && typeof verifier !== 'string') return undefined;
    return { verifier, returnTo: typeof returnTo === 'string' ? ownPath(returnTo) : undefined };
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
        const query = url.searchParams;

        if (this.options.login.matches(url.pathname)) {
            const begun = await this.begin(query);
            return begun instanceof Response ? begun : this.uncached(await respond(begun));
        }
        if (!this.options.callback.matches(url.pathname)) return undefined;

        const state = query.get('state') ?? '';
        const pending = RANDOM_TOKEN.test(state) ? pendingIn(cookieOf(request, this.cookieName(state))) : undefined;
        if (!pending) return this.uncached(await respond({ kind: 'invalid' }));

        const response = this.uncached(await respond(await this.finish(query, pending)));
        response.headers.append('set-cookie', this.cookie(state, '', 0));
        return response;
    }

    public loginUrl({ scopes = [], ...link }: AnyLoginLink = {}): string {
        const url = new URL(this.options.login.url);
        url.search = makeURLSearchParams({
            scopes: scopes.length > 0 ? scopes.join(' ') : undefined,
            ...link
        }).toString();
        return url.href;
    }

    public authorizeUrl({
        state,
        codeChallenge,
        scopes = [],
        permissions,
        guildId,
        disableGuildSelect,
        integrationType
    }: AnyAuthorizeUrlOptions): string {
        const url = new URL(OAuth2Routes.authorizationURL);
        url.search = makeURLSearchParams({
            client_id: this.options.clientId,
            redirect_uri: this.options.callback.url.href,
            response_type: 'code',
            scope: union(this.options.scopes, scopes).join(' '),
            state,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallenge === undefined ? undefined : 'S256',
            permissions,
            guild_id: guildId,
            disable_guild_select: disableGuildSelect,
            integration_type: integrationType
        }).toString();
        return url.href;
    }

    public async exchange(code: string, codeVerifier?: string): Promise<OAuthLogin | undefined> {
        return this.options.tokens.claim({ code, redirectUri: this.options.callback.url.href, codeVerifier });
    }

    private async begin(query: URLSearchParams): Promise<Response | FailedLogin> {
        const { scopes } = this.options;
        // every login already requests `scopes`, and a link may list one of them again
        const asked = difference(compact(query.get('scopes')?.split(' ') ?? []), scopes);
        const listed: ReadonlySet<string> = this.options.extraScopes;
        const extra = asked.filter((scope): scope is OAuthScope => listed.has(scope));
        if (extra.length < asked.length) return { kind: 'unlisted', scopes: difference(asked, extra) };

        // discord answers `invalid_scope` to a PKCE challenge that comes with this scope
        const pkce = !union(scopes, extra).includes('role_connections.write');
        const state = randomToken();
        const verifier = pkce ? randomToken() : undefined;
        const pending = { verifier, returnTo: query.get('returnTo') ?? undefined };

        const location = this.authorizeUrl({
            ...installOptionsIn(query),
            state,
            codeChallenge: verifier === undefined ? undefined : await challengeOf(verifier),
            scopes: extra
        });
        const response = this.uncached(new Response(null, { status: FOUND, headers: { location } }));
        const saved = Buffer.from(JSON.stringify(pending)).toString('base64url');
        response.headers.append('set-cookie', this.cookie(state, saved, COOKIE_SECONDS));
        return response;
    }

    private async finish(query: URLSearchParams, pending: Pending): Promise<LoginOutcome> {
        if (query.get('iss') !== ISSUER) return { kind: 'invalid' };

        const error = query.get('error');
        if (error !== null) return { kind: 'denied', error };

        const code = query.get('code');
        const login = code === null ? undefined : await this.exchange(code, pending.verifier);
        if (!login) return { kind: 'invalid' };
        const permissions = query.get('permissions') ?? undefined;
        return { kind: 'login', login: { ...login, returnTo: pending.returnTo, permissions } };
    }

    // each login has its own cookie because a second tab's login would replace a shared one
    private cookieName(state: string): string {
        return `${COOKIE}_${state}`;
    }

    // HttpOnly so page scripts can't read it. it has to be Lax because Strict wouldn't send it when
    // discord redirects back. the path comes from the public url since that's the only one the browser has
    private cookie(state: string, value: string, maxAge: number): string {
        const { url } = this.options.callback;
        const secure = url.protocol === 'https:' ? '; Secure' : '';
        const path = new URL('.', url).pathname;
        return `${this.cookieName(state)}=${value}; HttpOnly; SameSite=Lax; Path=${path}; Max-Age=${maxAge}${secure}`;
    }

    // these urls have the code and the state in them, and a cache shouldn't keep either
    private uncached(response: Response): Response {
        // copied because Response.redirect() gives headers that can't be changed
        const copy = new Response(response.body, response);
        copy.headers.set('cache-control', 'no-store');
        return copy;
    }
}
