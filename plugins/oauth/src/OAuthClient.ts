import { DiscordAPIError, makeURLSearchParams, RequestMethod } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { OAuth2Routes, Routes } from 'discord-api-types/v10';
import { delay } from 'es-toolkit';

import { TokenEndpoint } from './TokenEndpoint';
import { TokenVault } from './TokenVault';

import type { AuthorizeUrlOptions } from './AuthorizeUrlOptions';
import type { SavedTokens, TokenStore } from './TokenVault';
import type { GuildJoin, GuildJoinOptions, OAuthScope, UserCalls, UserRest } from './UserCalls';
import type { REST, RequestData } from '@discordjs/rest';
import type {
    APIGuild,
    APIGuildMember,
    APIUser,
    APIWebhook,
    RESTGetAPIOAuth2CurrentAuthorizationResult,
    RESTPostOAuth2AccessTokenResult
} from 'discord-api-types/v10';

/**
 * What {@link OAuthClient} needs to talk to Discord and to keep each user's tokens.
 *
 * @typeParam TScopes - The `scopes` you pass.
 * @typeParam TExtra - The `extraScopes` you pass.
 */
export interface OAuthClientOptions<TScopes extends OAuthScope = never, TExtra extends OAuthScope = never> {
    /**
     * A `@discordjs/rest` client, like `bot.rest`. The client sends every call with it, which queues them
     * behind its rate limits. They don't carry the bot's token.
     */
    rest: REST;
    /** Where the tokens are kept, encrypted. In a seedcord bot, pass `bot.kv.collection<string>('oauth-tokens')`. */
    store: TokenStore;
    /** The application's id, like `bot.applicationId`. */
    clientId: string;
    /**
     * The client secret from the application's OAuth2 page. The client also derives the key that encrypts
     * the tokens from it. After you rotate it, every user has to log in again.
     */
    clientSecret: string;
    /** The callback address. It has to match one of the redirects on the application's OAuth2 page exactly. */
    redirectUri: string | URL;
    /** The scopes to request on every login. `identify` is always added. */
    scopes?: readonly TScopes[] | undefined;
    /**
     * Scopes that one feature needs, requested only by a login link that lists them. A user who never
     * opened such a link doesn't have them, and the typed calls for them resolve to `undefined`.
     */
    extraScopes?: readonly TExtra[] | undefined;
}

/** A finished login. */
export interface OAuthLogin {
    user: APIUser;
    /** The scopes Discord granted. Discord adds scopes that the user approved for the application earlier. */
    scopes: OAuthScope[];
    /** The server that the bot was added to when the login had the `bot` scope. */
    guild?: APIGuild | undefined;
    /** The webhook that Discord created when the login had the `webhook.incoming` scope. */
    webhook?: APIWebhook | undefined;
}

// discord's access tokens last 7 days. refreshing 5 minutes early keeps a token from expiring while a
// request that uses it is on its way
const REFRESH_EARLY_MS = 300_000;

// the process that won a refresh race gets its 200 at about the same moment the loser gets its 400, and
// writes the new tokens to the store a few milliseconds later. 250ms is a guess that leaves room for a
// slow store
const RACE_WAIT_MS = 250;

const UNAUTHORIZED = 401;
const NO_CONTENT = 204;

interface UserRequest {
    method: keyof UserRest;
    route: `/${string}`;
    options?: RequestData | undefined;
}

/**
 * Discord's OAuth2 flow for one application, with each user's tokens kept encrypted in a store and
 * refreshed before they expire.
 *
 * `@seedcord/plugin-oauth`'s `OAuth` plugin builds one for you. Build your own when you want the calls
 * without attaching the plugin.
 *
 * @typeParam TScopes - The `scopes` from the options. Leave it out.
 * @typeParam TExtra - The `extraScopes` from the options. Leave it out.
 * @example
 * ```ts
 * const oauth = new OAuthClient({
 *     rest: bot.rest,
 *     store: bot.kv.collection<string>('oauth-tokens'),
 *     clientId: bot.applicationId,
 *     clientSecret: Envapter.getRequired('DISCORD_CLIENT_SECRET'),
 *     redirectUri: new URL('oauth/callback', bot.url),
 *     scopes: ['guilds'],
 *     extraScopes: ['connections']
 * });
 *
 * const login = await oauth.exchange(code);
 * const guilds = await oauth.as(login.user.id).guilds();
 * const connections = await oauth.as(login.user.id).connections(); // undefined until they grant it
 * ```
 */
export class OAuthClient<TScopes extends OAuthScope = never, TExtra extends OAuthScope = never> {
    readonly #rest: REST;
    readonly #clientId: string;
    readonly #redirectUri: string;
    readonly #scopes: readonly OAuthScope[];
    readonly #extraScopes: ReadonlySet<OAuthScope>;
    readonly #endpoint: TokenEndpoint;
    readonly #vault: TokenVault;

    constructor({
        rest,
        store,
        clientId,
        clientSecret,
        redirectUri,
        scopes = [],
        extraScopes = []
    }: OAuthClientOptions<TScopes, TExtra>) {
        this.#rest = rest;
        this.#clientId = clientId;
        this.#redirectUri = String(redirectUri);
        // the tokens are saved under the user's id, and discord only returns the user with identify
        this.#scopes = ['identify', ...scopes];
        // a scope in both lists is on every login, and the types read it that way too
        this.#extraScopes = new Set<OAuthScope>(extraScopes).difference(new Set(this.#scopes));
        this.#endpoint = new TokenEndpoint(rest, clientId, clientSecret);
        this.#vault = new TokenVault(store, clientId, clientSecret);
    }

    /** Builds the link that sends a visitor to Discord's consent screen. */
    public authorizeUrl(options: AuthorizeUrlOptions<TScopes, TExtra>): string;
    // the implementation reads every option. the signature above only offers the ones for the client's scopes
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
            redirect_uri: this.#redirectUri,
            response_type: 'code',
            scope: [...new Set([...this.#scopes, ...scopes])].join(' '),
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
     * Trades the `code` from Discord's redirect for the user's tokens and saves them.
     *
     * Resolves to `undefined` when Discord refuses the code. A reloaded callback page gets `undefined`
     * because a code works once.
     *
     * @param codeVerifier - The PKCE verifier for an authorize link that had a `codeChallenge`.
     * @throws A **SeedcordTypeError** when the login's scopes don't include `identify`.
     */
    public async exchange(code: string, codeVerifier?: string): Promise<OAuthLogin | undefined> {
        const granted = await this.#endpoint.exchange({ code, redirectUri: this.#redirectUri, codeVerifier });
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
        // the client can't tell which scope an arbitrary route needs, which is why these skip the scope check
        const unscoped =
            (method: keyof UserRest) =>
            async (route: `/${string}`, options?: RequestData): Promise<unknown> =>
                this.#send(userId, await this.#tokens(userId), { method, route, options }, false);
        const roleConnection = Routes.userApplicationRoleConnection(this.#clientId);

        // typed with every scope as an extra one, the case where each scoped call can resolve to undefined
        const calls: UserCalls<never, OAuthScope> = {
            get: unscoped('get'),
            post: unscoped('post'),
            put: unscoped('put'),
            patch: unscoped('patch'),
            delete: unscoped('delete'),
            // every saved login has identify, which exchange() checks
            user: async () =>
                this.#send(userId, await this.#tokens(userId), { method: 'get', route: Routes.user('@me') }, true),
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
        // justified: the two lists only change which of these calls compile, and whether one admits undefined
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
        return saved ? this.#send(userId, saved, request, true) : undefined;
    }

    // TResult is unchecked. discord documents each route's body, and a typed call passes the type that
    // matches its route
    async #send<TResult>(
        userId: string,
        saved: SavedTokens,
        { method, route, options }: UserRequest,
        scopeGranted: boolean
    ): Promise<TResult> {
        const send = async (accessToken: string): Promise<TResult> =>
            // justified: see above
            (await this.#rest[method](route, { ...options, ...bearer(accessToken, options?.headers) })) as TResult;
        try {
            return await send(saved.accessToken);
        } catch (error) {
            if (!(error instanceof DiscordAPIError) || error.status !== UNAUTHORIZED) throw error;
            // another process may have just refreshed these tokens, which ends the old access token at once
            const latest = await this.#vault.read(userId);
            if (latest && latest.accessToken !== saved.accessToken) return send(latest.accessToken);
            // discord also answers 401 for a scope that the user never granted. only a call whose scope
            // was checked can tell that the grant ended
            if (!scopeGranted) throw error;
            await this.#vault.delete(userId);
            throw new SeedcordError(SeedcordErrorCode.PluginOAuthLoginNeeded, [userId]);
        }
    }

    // discord only accepts this one from the bot, with the user's access token in the body
    async #joinGuild(userId: string, guildId: string, options?: GuildJoinOptions): Promise<GuildJoin | undefined> {
        const saved = await this.#granted(userId, 'guilds.join');
        if (!saved) return undefined;

        // queueRequest returns the response itself. put() would only return the parsed body, and the
        // status is what tells the two answers apart
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
        if (this.#extraScopes.has(scope)) return undefined;
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

// auth: false stops @discordjs/rest from sending the bot token, and from clearing it when a user's call gets a 401
function bearer(accessToken: string, headers?: Record<string, string>): Pick<RequestData, 'auth' | 'headers'> {
    return { auth: false, headers: { ...headers, Authorization: `Bearer ${accessToken}` } };
}
