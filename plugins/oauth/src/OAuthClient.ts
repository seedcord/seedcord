import { DiscordAPIError, makeURLSearchParams, RequestMethod } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { OAuth2Routes, Routes } from 'discord-api-types/v10';
import { delay, difference, union } from 'es-toolkit';

import { AuthorizationFlow } from './AuthorizationFlow';
import { MountedPath } from './MountedPath';
import { TokenEndpoint } from './TokenEndpoint';
import { TokenVault } from './TokenVault';

import type { AuthorizeUrlOptions, LoginLink } from './AuthorizeUrlOptions';
import type { LoginOutcome, OAuthLogin } from './LoginOutcome';
import type { OAuthClientOptions } from './OAuthClientOptions';
import type { SavedTokens } from './TokenVault';
import type { GuildJoin, GuildJoinOptions, OAuthScope, UserCalls, UserRest } from './UserCalls';
import type { REST, RequestData } from '@discordjs/rest';
import type {
    APIGuildMember,
    RESTGetAPIOAuth2CurrentAuthorizationResult,
    RESTPostOAuth2AccessTokenResult
} from 'discord-api-types/v10';
import type { Promisable } from 'type-fest';

// discord's access tokens last 7 days. we refresh 5 minutes early so one doesn't expire in the middle
// of a request
const REFRESH_EARLY_MS = 5 * 60 * 1000;

// when two processes refresh at once, the loser gets its 400 at about the same time the winner gets its
// 200, and the winner still has to save the new tokens. the loser waits this long before it reads the
// store. 250ms is a guess that should cover a slow store
const RACE_WAIT_MS = 250;

const UNAUTHORIZED = 401;
const NO_CONTENT = 204;

interface UserRequest {
    method: keyof UserRest;
    route: `/${string}`;
    options?: RequestData | undefined;
}

/**
 * Discord's OAuth2 login for one application. It serves the login and callback routes, keeps each
 * user's tokens encrypted in a store, and refreshes them before they expire.
 *
 * `@seedcord/plugin-oauth`'s `OAuth` plugin builds one for you. Build your own to use it without
 * seedcord, in any server that has a `Request` and takes a `Response`.
 *
 * @typeParam TScopes - The `scopes` from the options. Leave it out.
 * @typeParam TExtra - The `extraScopes` from the options. Leave it out.
 * @example
 * ```ts
 * const oauth = new OAuthClient({
 *     rest: new REST(),
 *     store: new Map(),
 *     clientId: '1564002376115949650',
 *     clientSecret: process.env.DISCORD_CLIENT_SECRET,
 *     baseUrl: 'https://example.com',
 *     scopes: ['guilds'],
 *     extraScopes: ['connections']
 * });
 *
 * // in your server's request handler
 * const response = await oauth.fetch(request, (outcome) =>
 *     outcome.kind === 'login'
 *         ? Response.redirect(new URL(outcome.login.returnTo ?? '/dashboard', request.url))
 *         : new Response('The login failed.', { status: 400 })
 * );
 *
 * // anywhere after that
 * const guilds = await oauth.as(userId).guilds();
 * const connections = await oauth.as(userId).connections(); // undefined until they grant it
 * ```
 */
export class OAuthClient<TScopes extends OAuthScope = never, TExtra extends OAuthScope = never> {
    /** The scopes that every login requests, `identify` included. */
    public readonly scopes: readonly OAuthScope[];
    /** The scopes that only a login link can add. A scope that's also in `scopes` isn't in this set. */
    public readonly extraScopes: ReadonlySet<OAuthScope>;
    /** The callback route's full address. Discord refuses logins until it's under Redirects on the OAuth2 page. */
    public readonly redirectUri: string;

    readonly #rest: REST;
    readonly #clientId: string;
    readonly #endpoint: TokenEndpoint;
    readonly #vault: TokenVault;
    readonly #flow: AuthorizationFlow;

    constructor({
        rest,
        store,
        clientId,
        clientSecret,
        baseUrl,
        routes = {},
        scopes = [],
        extraScopes = []
    }: OAuthClientOptions<TScopes, TExtra>) {
        this.#rest = rest;
        this.#clientId = clientId;
        // the tokens are saved under the user's id, and discord only returns the user with identify
        this.scopes = union<OAuthScope>(['identify'], scopes);
        // a scope that's in both lists counts as a normal scope. the types treat it that way too
        this.extraScopes = new Set(difference<OAuthScope>(extraScopes, this.scopes));
        this.#endpoint = new TokenEndpoint(rest, clientId, clientSecret);
        this.#vault = new TokenVault(store, clientId, clientSecret);

        const callback = new MountedPath(baseUrl, routes.callback ?? 'oauth/callback');
        this.redirectUri = callback.url.href;
        this.#flow = new AuthorizationFlow({
            client: this,
            login: new MountedPath(baseUrl, routes.login ?? 'oauth/login'),
            callback
        });
    }

    /**
     * Answers a request for the login route or the callback route. Resolves to `undefined` for any other
     * request, which your server should answer itself.
     *
     * The login route sends the visitor to Discord. The callback route checks that this browser started
     * the login, saves the user's tokens, and then calls `respond`.
     *
     * @param respond - Returns what the visitor's browser gets after the callback, usually a redirect.
     */
    public async fetch(
        request: Request,
        respond: (outcome: LoginOutcome) => Promisable<Response>
    ): Promise<Response | undefined> {
        return this.#flow.fetch(request, respond);
    }

    /**
     * The address of the login route. Send a browser there, or put it in a message.
     *
     * @example
     * ```ts
     * // requests one more scope, and ends on the page that needed it
     * oauth.loginUrl({ scopes: ['connections'], returnTo: '/dashboard/accounts' });
     * ```
     */
    public loginUrl(link?: LoginLink<TScopes, TExtra>): string;
    // callers get the overload above, with only the options their scopes allow. the flow reads them all
    public loginUrl(link?: LoginLink): string {
        return this.#flow.loginUrl(link);
    }

    /** The link to Discord's consent screen. `fetch()` builds it for you unless you keep your own `state`. */
    public authorizeUrl(options: AuthorizeUrlOptions<TScopes, TExtra>): string;
    // callers get the overload above, with only the options their scopes allow. this one reads them all
    public authorizeUrl({
        state,
        codeChallenge,
        scopes = [],
        permissions,
        guildId,
        disableGuildSelect,
        integrationType
    }: AuthorizeUrlOptions<OAuthScope, OAuthScope>): string {
        const url = new URL(OAuth2Routes.authorizationURL);
        url.search = makeURLSearchParams({
            client_id: this.#clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: union(this.scopes, scopes).join(' '),
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

    /**
     * Trades the `code` from Discord's redirect for the user's tokens and saves them. Only for a server
     * that keeps its own `state`. `fetch()` does this for you.
     *
     * Resolves to `undefined` when Discord refuses the code. A reloaded callback page gets `undefined`
     * because a code works once.
     *
     * @param codeVerifier - The PKCE verifier for an authorize link that had a `codeChallenge`.
     * @throws A **SeedcordTypeError** when the login's scopes don't include `identify`.
     */
    public async exchange(code: string, codeVerifier?: string): Promise<OAuthLogin | undefined> {
        const granted = await this.#endpoint.exchange({ code, redirectUri: this.redirectUri, codeVerifier });
        if (!granted) return undefined;

        // justified: discord documents this body for the route
        const { user } = (await this.#rest.get(
            Routes.oauth2CurrentAuthorization(),
            bearer(granted.access_token)
        )) as RESTGetAPIOAuth2CurrentAuthorizationResult;
        if (!user) throw new SeedcordTypeError(SeedcordErrorCode.PluginOAuthIdentifyMissing);

        const { scopes } = await this.#save(user.id, granted);
        return { user, scopes, guild: granted.guild, webhook: granted.webhook };
    }

    /**
     * Calls Discord as a user who logged in. `user()`, `guilds()`, `guildMember()`, and `connections()`
     * return typed results. `get`, `post`, `put`, `patch`, and `delete` take what `bot.rest`'s take and
     * reach every other route.
     *
     * Each call reads the user's tokens and refreshes them first when they're about to expire. A typed
     * call also checks that the user granted its scope before it calls Discord.
     *
     * @throws A **SeedcordError** with the code `PluginOAuthLoginNeeded` from any call when the user never
     * logged in or their grant ended, and from a typed call when the user's login is older than a scope
     * you added to `scopes`. Send them through the login again.
     * @example
     * ```ts
     * const guilds = await oauth.as(userId).guilds({ with_counts: true });
     * const entitlements = await oauth.as(userId).get('/users/@me/entitlements');
     * ```
     */
    public as(userId: string): UserCalls<TScopes, TExtra> {
        // these skip the scope check because we can't know which scope a random route needs
        const unscoped =
            (method: keyof UserRest) =>
            async (route: `/${string}`, options?: RequestData): Promise<unknown> =>
                this.#send(userId, await this.#tokens(userId), { method, route, options });
        const roleConnection = Routes.userApplicationRoleConnection(this.#clientId);

        // typed as if every scope was an extra one. that's the widest version, where every typed call
        // can give undefined
        const calls: UserCalls<never, OAuthScope> = {
            get: unscoped('get'),
            post: unscoped('post'),
            put: unscoped('put'),
            patch: unscoped('patch'),
            delete: unscoped('delete'),
            // identify isn't checked here because exchange() already refuses a login without it
            user: async () => {
                const saved = await this.#tokens(userId);
                const request: UserRequest = { method: 'get', route: Routes.user('@me') };
                return this.#grantEndedOn401(userId, this.#send(userId, saved, request));
            },
            guilds: async (query) =>
                this.#scoped(userId, 'guilds', {
                    method: 'get',
                    route: Routes.userGuilds(),
                    options: { query: makeURLSearchParams(query) }
                }),
            guildMember: async (guildId) =>
                this.#scoped(userId, 'guilds.members.read', { method: 'get', route: Routes.userGuildMember(guildId) }),
            connections: async () =>
                this.#scoped(userId, 'connections', { method: 'get', route: Routes.userConnections() }),
            joinGuild: async (guildId, options) => this.#joinGuild(userId, guildId, options),
            roleConnection: async () =>
                this.#scoped(userId, 'role_connections.write', { method: 'get', route: roleConnection }),
            setRoleConnection: async (connection) =>
                this.#scoped(userId, 'role_connections.write', {
                    method: 'put',
                    route: roleConnection,
                    options: { body: connection }
                })
        };
        // justified: the object is the same whatever the two lists are. they only change which calls
        // compile and which can give undefined
        return calls as UserCalls<TScopes, TExtra>;
    }

    /** The scopes that a user granted, or `undefined` for a user without saved tokens. It doesn't call Discord. */
    public async scopesOf(userId: string): Promise<OAuthScope[] | undefined> {
        const saved = await this.#vault.read(userId);
        return saved?.scopes;
    }

    /** Deletes a user's saved tokens. It doesn't call Discord, and the user's grant there keeps working. */
    public async forget(userId: string): Promise<void> {
        await this.#vault.delete(userId);
    }

    /**
     * Revokes a user's grant on Discord and deletes their saved tokens.
     *
     * Discord ends every grant that the user gave your application, including tokens that another
     * `OAuthClient` or plugin saved for them. Use {@link OAuthClient.forget} to log someone out of one place.
     */
    public async revoke(userId: string): Promise<void> {
        const saved = await this.#vault.read(userId);
        if (!saved) return;
        await this.#endpoint.revoke(saved.refreshToken);
        await this.#vault.delete(userId);
    }

    async #scoped<TResult>(userId: string, scope: OAuthScope, request: UserRequest): Promise<TResult | undefined> {
        const saved = await this.#granted(userId, scope);
        return saved ? this.#grantEndedOn401(userId, this.#send<TResult>(userId, saved, request)) : undefined;
    }

    // only for a call whose scope the user granted. discord also answers 401 for a scope that they never
    // granted, while their grant still works
    async #grantEndedOn401<TResult>(userId: string, call: Promise<TResult>): Promise<TResult> {
        try {
            return await call;
        } catch (error) {
            if (!isUnauthorized(error)) throw error;
            await this.#vault.delete(userId);
            throw new SeedcordError(SeedcordErrorCode.PluginOAuthLoginNeeded, [userId]);
        }
    }

    // nothing checks TResult. each typed call passes the type that discord documents for its route
    async #send<TResult>(
        userId: string,
        saved: SavedTokens,
        { method, route, options }: UserRequest
    ): Promise<TResult> {
        const send = async (accessToken: string): Promise<TResult> =>
            // justified: see above
            (await this.#rest[method](route, { ...options, ...bearer(accessToken, options?.headers) })) as TResult;
        try {
            return await send(saved.accessToken);
        } catch (error) {
            if (!isUnauthorized(error)) throw error;
            // a 401 can just mean another process refreshed these tokens. discord ends the old access
            // token as soon as that happens
            const latest = await this.#vault.read(userId);
            if (latest && latest.accessToken !== saved.accessToken) return send(latest.accessToken);
            throw error;
        }
    }

    // discord only accepts this one from the bot, with the user's access token in the body
    async #joinGuild(userId: string, guildId: string, options?: GuildJoinOptions): Promise<GuildJoin | undefined> {
        const saved = await this.#granted(userId, 'guilds.join');
        if (!saved) return undefined;

        // queueRequest because we need the status code, and put() only gives the parsed body
        const response = await this.#rest.queueRequest({
            method: RequestMethod.Put,
            fullRoute: Routes.guildMember(guildId, userId),
            body: { ...options, access_token: saved.accessToken }
        });
        // discord answers 204 without a body for a user who is already in the server
        if (response.status === NO_CONTENT) return { added: false };
        // justified: discord documents this body for a 201
        return { added: true, member: (await response.json()) as APIGuildMember };
    }

    async #granted(userId: string, scope: OAuthScope): Promise<SavedTokens | undefined> {
        const saved = await this.#tokens(userId);
        if (saved.scopes.includes(scope)) return saved;
        if (this.extraScopes.has(scope)) return undefined;
        // a login from before this scope was added to `scopes`
        throw new SeedcordError(SeedcordErrorCode.PluginOAuthLoginNeeded, [userId]);
    }

    async #tokens(userId: string): Promise<SavedTokens> {
        const saved = await this.#vault.read(userId);
        if (!saved) throw new SeedcordError(SeedcordErrorCode.PluginOAuthLoginNeeded, [userId]);
        if (saved.expiresAt - REFRESH_EARLY_MS > Date.now()) return saved;
        return this.#refresh(userId, saved);
    }

    // a refresh token works once. when two processes refresh the same one, discord answers the second
    // with the same invalid_grant it gives for a grant that ended. the only difference is in the store,
    // where the winner saves newer tokens. two calls in one process race the same way and take the same
    // path. they don't share one refresh promise because workers cancels a request that waits on a promise
    // made by another request.
    async #refresh(userId: string, saved: SavedTokens): Promise<SavedTokens> {
        const granted = await this.#endpoint.refresh(saved.refreshToken);
        if (granted) return this.#save(userId, granted);

        await delay(RACE_WAIT_MS);
        const latest = await this.#vault.read(userId);
        if (latest && latest.refreshToken !== saved.refreshToken) return latest;

        await this.#vault.delete(userId);
        throw new SeedcordError(SeedcordErrorCode.PluginOAuthLoginNeeded, [userId]);
    }

    async #save(userId: string, granted: RESTPostOAuth2AccessTokenResult): Promise<SavedTokens> {
        const tokens: SavedTokens = {
            accessToken: granted.access_token,
            refreshToken: granted.refresh_token,
            expiresAt: Date.now() + granted.expires_in * 1000,
            // justified: discord answers with its own scope names
            scopes: granted.scope.split(' ') as OAuthScope[]
        };
        await this.#vault.save(userId, tokens);
        return tokens;
    }
}

function isUnauthorized(error: unknown): boolean {
    return error instanceof DiscordAPIError && error.status === UNAUTHORIZED;
}

// auth: false stops @discordjs/rest from sending the bot token, and from clearing it when a user's call gets a 401
function bearer(accessToken: string, headers?: Record<string, string>): Pick<RequestData, 'auth' | 'headers'> {
    return { auth: false, headers: { ...headers, Authorization: `Bearer ${accessToken}` } };
}
