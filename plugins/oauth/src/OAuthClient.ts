import { makeURLSearchParams, RequestMethod } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { discordErrorOf } from '@seedcord/utils/internal';
import { RESTJSONErrorCodes, Routes } from 'discord-api-types/v10';
import { difference, union } from 'es-toolkit';

import { AuthorizationFlow } from './AuthorizationFlow';
import { MountedPath } from './MountedPath';
import { bearer } from './TokenEndpoint';
import { UserTokens } from './UserTokens';

import type { AnyAuthorizeUrlOptions, AnyLoginLink, AuthorizeUrlOptions, LoginLink } from './AuthorizeUrlOptions';
import type { LoginOutcome, OAuthLogin } from './LoginOutcome';
import type { OAuthClientOptions } from './OAuthClientOptions';
import type { SavedTokens } from './TokenVault';
import type { GuildJoin, GuildJoinOptions, OAuthScope, UserCalls, UserRest } from './UserCalls';
import type { REST, RequestData } from '@discordjs/rest';
import type { APIGuildMember } from 'discord-api-types/v10';
import type { Promisable } from 'type-fest';

const UNAUTHORIZED = 401;
const NO_CONTENT = 204;

interface UserRequest {
    method: keyof UserRest;
    route: `/${string}`;
    options?: RequestData | undefined;
}

interface TokenCall<TResult> {
    send(accessToken: string): Promise<TResult>;
    // true for the error that discord answers a dead access token with
    refused(error: unknown): boolean;
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
 *     rest: new REST().setToken(process.env.DISCORD_BOT_TOKEN),
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
    /** The callback route's full address. Discord refuses logins until it's under Redirects on the OAuth2 page. */
    public readonly redirectUri: string;

    readonly #rest: REST;
    readonly #clientId: string;
    readonly #extraScopes: ReadonlySet<OAuthScope>;
    readonly #tokens: UserTokens;
    readonly #flow: AuthorizationFlow;

    constructor({
        rest,
        store,
        clientId,
        clientSecret,
        baseUrl,
        routes = {},
        scopes = [],
        extraScopes = [],
        keepOpen
    }: OAuthClientOptions<TScopes, TExtra>) {
        this.#rest = rest;
        this.#clientId = clientId;
        // the tokens are saved under the user's id, and discord only returns the user with identify
        const everyLogin = union<OAuthScope>(['identify'], scopes);
        // a scope that's in both lists counts as a normal scope. the types treat it that way too
        this.#extraScopes = new Set(difference<OAuthScope>(extraScopes, everyLogin));
        this.#tokens = new UserTokens({ rest, store, clientId, clientSecret, keepOpen });

        const callback = new MountedPath(baseUrl, routes.callback ?? 'oauth/callback');
        this.redirectUri = callback.url.href;
        this.#flow = new AuthorizationFlow({
            tokens: this.#tokens,
            clientId,
            scopes: everyLogin,
            extraScopes: this.#extraScopes,
            login: new MountedPath(baseUrl, routes.login ?? 'oauth/login'),
            callback
        });
    }

    /**
     * Answers a request for the login route or the callback route. Resolves to `undefined` for any other
     * request, which your server should answer itself.
     *
     * The login route sends the visitor to Discord. The callback route checks that this browser started
     * the login, saves the user's tokens, and then calls `respond`. The login route also calls `respond`,
     * with an `unlisted` outcome, for a link that requests a scope outside `extraScopes`.
     *
     * @param respond - Returns what the visitor's browser gets for that outcome, usually a redirect.
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
    public loginUrl(link?: AnyLoginLink): string {
        return this.#flow.loginUrl(link);
    }

    /** The link to Discord's consent screen. Call it only if your server handles `state` itself. */
    public authorizeUrl(options: AuthorizeUrlOptions<TScopes, TExtra>): string;
    public authorizeUrl(options: AnyAuthorizeUrlOptions): string {
        return this.#flow.authorizeUrl(options);
    }

    /**
     * Trades the `code` from Discord's redirect for the user's tokens and saves them. Call it only if
     * your server handles `state` itself.
     *
     * Resolves to `undefined` when Discord refuses the code. A reloaded callback page gets `undefined`
     * because a code works once.
     *
     * @param codeVerifier - The PKCE verifier for an authorize link that had a `codeChallenge`.
     * @throws A **SeedcordError** when the authorize link didn't request `identify`.
     */
    public async exchange(code: string, codeVerifier?: string): Promise<OAuthLogin | undefined> {
        return this.#flow.exchange(code, codeVerifier);
    }

    /**
     * Calls Discord as a user who logged in. `user()`, `guilds()`, `guildMember()`, and `connections()`
     * return typed results. `get`, `post`, `put`, `patch`, and `delete` take the same arguments as your `REST`
     * client's methods and reach any other route.
     *
     * Each call reads the user's tokens and refreshes them first when they're about to expire. A typed
     * call also checks that the user granted its scope before it calls Discord.
     *
     * @throws A **SeedcordError** with the code `PluginOAuthLoginNeeded` from any call when the user never
     * logged in or Discord refused to refresh their tokens. A typed call also throws it when Discord
     * refuses the access token, and when the user's login is older than a scope you added to `scopes`.
     * Send them through the login again.
     * @example
     * ```ts
     * const guilds = await oauth.as(userId).guilds({ with_counts: true });
     * const authorization = await oauth.as(userId).get('/oauth2/@me');
     * ```
     */
    public as(userId: string): UserCalls<TScopes, TExtra> {
        // these skip the scope check because the client can't tell which scope a route needs
        const unscoped =
            (method: keyof UserRest) =>
            async (route: `/${string}`, options?: RequestData): Promise<unknown> =>
                this.#call(userId, undefined, this.#restCall({ method, route, options }));
        const scoped = async <TResult>(scope: OAuthScope, request: UserRequest): Promise<TResult | undefined> =>
            this.#call(userId, scope, this.#restCall<TResult>(request));
        const roleConnection = Routes.userApplicationRoleConnection(this.#clientId);

        // typed as if every scope was an extra one, where every typed call can give undefined
        const calls: UserCalls<never, OAuthScope> = {
            get: unscoped('get'),
            post: unscoped('post'),
            put: unscoped('put'),
            patch: unscoped('patch'),
            delete: unscoped('delete'),
            user: async () =>
                this.#call(userId, 'identify', this.#restCall({ method: 'get', route: Routes.user('@me') })),
            guilds: async (query) =>
                scoped('guilds', {
                    method: 'get',
                    route: Routes.userGuilds(),
                    options: { query: makeURLSearchParams(query) }
                }),
            guildMember: async (guildId) =>
                scoped('guilds.members.read', { method: 'get', route: Routes.userGuildMember(guildId) }),
            connections: async () => scoped('connections', { method: 'get', route: Routes.userConnections() }),
            joinGuild: async (guildId, options) =>
                this.#call(userId, 'guilds.join', this.#guildJoin(userId, guildId, options)),
            roleConnection: async () => scoped('role_connections.write', { method: 'get', route: roleConnection }),
            setRoleConnection: async (connection) =>
                scoped('role_connections.write', {
                    method: 'put',
                    route: roleConnection,
                    options: { body: connection }
                })
        };
        // justified: the object is the same for any scopes. the lists only change which calls compile and
        // which can give undefined
        return calls as UserCalls<TScopes, TExtra>;
    }

    /** The scopes that a user granted, or `undefined` for a user without saved tokens. It doesn't call Discord. */
    public async scopesOf(userId: string): Promise<OAuthScope[] | undefined> {
        const saved = await this.#tokens.saved(userId);
        return saved?.scopes;
    }

    /** Deletes a user's saved tokens. It doesn't call Discord, and the user's grant there keeps working. */
    public async forget(userId: string): Promise<void> {
        await this.#tokens.forget(userId);
    }

    /**
     * Revokes a user's grant on Discord and deletes their saved tokens.
     *
     * Discord ends every grant that the user gave your application, so tokens that another `OAuthClient`
     * saved for them stop working too. Use {@link OAuthClient.forget} to log someone out of one place.
     */
    public async revoke(userId: string): Promise<void> {
        await this.#tokens.revoke(userId);
    }

    // nothing checks TResult. each typed call passes the type that discord documents for its route
    #restCall<TResult>({ method, route, options }: UserRequest): TokenCall<TResult> {
        return {
            send: async (accessToken) =>
                // justified: see above
                (await this.#rest[method](route, { ...options, ...bearer(accessToken, options?.headers) })) as TResult,
            refused: (error) => discordErrorOf(error)?.status === UNAUTHORIZED
        };
    }

    // discord only accepts this one from the bot, with the user's access token in the body
    #guildJoin(userId: string, guildId: string, options?: GuildJoinOptions): TokenCall<GuildJoin> {
        return {
            send: async (accessToken) => {
                // queueRequest because we need the status code, and put() only gives the parsed body
                const response = await this.#rest.queueRequest({
                    method: RequestMethod.Put,
                    fullRoute: Routes.guildMember(guildId, userId),
                    body: { ...options, access_token: accessToken }
                });
                // discord answers 204 without a body for a user who is already in the server
                if (response.status === NO_CONTENT) return { added: false };
                // justified: discord documents this body for a 201
                return { added: true, member: (await response.json()) as APIGuildMember };
            },
            refused: (error) => discordErrorOf(error)?.code === RESTJSONErrorCodes.InvalidOAuth2AccessToken
        };
    }

    // every call as a user comes through here. `scope` is undefined for the raw REST calls.
    // identify is in every login and a raw call doesn't check a scope, which is why those two overloads
    // never give undefined
    #call<TResult>(userId: string, scope: 'identify' | undefined, call: TokenCall<TResult>): Promise<TResult>;
    #call<TResult>(userId: string, scope: OAuthScope, call: TokenCall<TResult>): Promise<TResult | undefined>;
    async #call<TResult>(
        userId: string,
        scope: OAuthScope | undefined,
        call: TokenCall<TResult>
    ): Promise<TResult | undefined> {
        const saved = await this.#tokens.loggedIn(userId);
        if (!this.#granted(userId, saved, scope)) return undefined;
        const tokens = await this.#tokens.unexpired(userId, saved);
        try {
            return await call.send(tokens.accessToken);
        } catch (error) {
            if (!call.refused(error)) throw error;
            // discord ends the old access token as soon as another process refreshes it
            const newer = await this.#tokens.newerThan(userId, tokens);
            if (!newer) throw this.#refusal(userId, scope, error);
            if (!this.#granted(userId, newer, scope)) return undefined;
            return call.send(newer.accessToken).catch((again: unknown) => {
                throw call.refused(again) ? this.#refusal(userId, scope, again) : again;
            });
        }
    }

    // false for an extra scope that the user hasn't granted yet
    #granted(userId: string, tokens: SavedTokens, scope: OAuthScope | undefined): boolean {
        if (scope === undefined || tokens.scopes.includes(scope)) return true;
        if (this.#extraScopes.has(scope)) return false;
        throw new SeedcordError(SeedcordErrorCode.PluginOAuthLoginNeeded, [userId, { missingScope: scope }]);
    }

    // discord also answers 401 for a scope that the user never granted, and their tokens still work then.
    // a raw call could be either one, and its caller gets discord's error
    #refusal(userId: string, scope: OAuthScope | undefined, error: unknown): unknown {
        if (scope === undefined) return error;
        return new SeedcordError(SeedcordErrorCode.PluginOAuthLoginNeeded, [userId, 'refused'], { cause: error });
    }
}
