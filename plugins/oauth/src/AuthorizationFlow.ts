import { Buffer } from 'node:buffer';

import { makeURLSearchParams } from '@discordjs/rest';
import { OAuth2Routes } from 'discord-api-types/v10';
import { compact, difference, union } from 'es-toolkit';

import { PendingCookie } from './PendingCookie';

import type { AnyAuthorizeUrlOptions, AnyLoginLink, BotLinkOptions, InstallLinkOptions } from './AuthorizeUrlOptions';
import type { FailedLogin, LoginOutcome, OAuthLogin } from './LoginOutcome';
import type { MountedPath } from './MountedPath';
import type { PendingLogin } from './PendingCookie';
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

const ISSUER = 'https://discord.com';
const RANDOM_BYTES = 32;
const FOUND = 302;

function randomToken(): string {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(RANDOM_BYTES))).toString('base64url');
}

async function challengeOf(verifier: string): Promise<string> {
    return Buffer.from(await crypto.subtle.digest('SHA-256', Buffer.from(verifier))).toString('base64url');
}

// reads back the options that loginUrl() put in the query. only digits get through because a visitor
// can edit the url
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
    private readonly cookies: PendingCookie;

    constructor(private readonly options: FlowOptions) {
        this.cookies = new PendingCookie(options.callback.url);
    }

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
        const pending = this.cookies.read(request, state);
        if (!pending) return this.uncached(await respond({ kind: 'invalid' }));

        const response = this.uncached(await respond(await this.finish(query, pending)));
        response.headers.append('set-cookie', this.cookies.clear(state));
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

        const location = this.authorizeUrl({
            ...installOptionsIn(query),
            state,
            codeChallenge: verifier === undefined ? undefined : await challengeOf(verifier),
            scopes: extra
        });
        const response = this.uncached(new Response(null, { status: FOUND, headers: { location } }));
        const returnTo = query.get('returnTo') ?? undefined;
        response.headers.append('set-cookie', this.cookies.save(state, { verifier, returnTo }));
        return response;
    }

    private async finish(query: URLSearchParams, pending: PendingLogin): Promise<LoginOutcome> {
        if (query.get('iss') !== ISSUER) return { kind: 'invalid' };

        const error = query.get('error');
        if (error !== null) return { kind: 'denied', error };

        const code = query.get('code');
        if (code === null) return { kind: 'invalid' };
        try {
            const login = await this.exchange(code, pending.verifier);
            if (!login) return { kind: 'invalid' };
            return { kind: 'login', login: { ...login, returnTo: pending.returnTo } };
        } catch (error) {
            return { kind: 'failed', error };
        }
    }

    // these urls have the code and the state in them, and a cache shouldn't keep either
    private uncached(response: Response): Response {
        // copied because Response.redirect() gives headers that can't be changed
        const copy = new Response(response.body, response);
        copy.headers.set('cache-control', 'no-store');
        return copy;
    }
}
