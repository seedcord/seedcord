import { makeURLSearchParams } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { OAuth2Routes, Routes } from 'discord-api-types/v10';
import { delay } from 'es-toolkit';

import { TokenEndpoint } from './TokenEndpoint';
import { TokenVault } from './TokenVault';

import type { SavedTokens, TokenStore } from './TokenVault';
import type { REST, RequestData } from '@discordjs/rest';
import type {
    APIUser,
    OAuth2Scopes,
    RESTGetAPICurrentUserConnectionsResult,
    RESTGetAPICurrentUserGuildsQuery,
    RESTGetAPICurrentUserGuildsResult,
    RESTGetAPICurrentUserResult,
    RESTGetAPIOAuth2CurrentAuthorizationResult,
    RESTGetCurrentUserGuildMemberResult,
    RESTPostOAuth2AccessTokenResult
} from 'discord-api-types/v10';

/** One of Discord's OAuth2 scopes, like `'identify'` or `'guilds'`. */
export type OAuthScope = `${OAuth2Scopes}`;

/**
 * What {@link OAuthClient} needs to talk to Discord and to keep each user's tokens.
 *
 * @typeParam TScopes - The scopes you pass. {@link OAuthClient.as} reads them to type the calls it allows.
 */
export interface OAuthClientOptions<TScopes extends OAuthScope = OAuthScope> {
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
    scopes: readonly TScopes[];
}

/** What {@link OAuthClient.authorizeUrl} puts in the link, besides the client's scopes. */
export interface AuthorizeUrlOptions {
    /** A random value that you tie to the visitor's browser and compare when Discord sends it back. */
    state: string;
    /**
     * The SHA-256 PKCE challenge, base64url encoded. Pass its verifier to {@link OAuthClient.exchange}.
     * Discord refuses a challenge together with the `role_connections.write` scope.
     */
    codeChallenge?: string | undefined;
}

/** A finished login. */
export interface OAuthLogin {
    user: APIUser;
    /** The scopes Discord granted. Discord adds scopes that the user approved for the application earlier. */
    scopes: OAuthScope[];
}

/** `bot.rest`'s verbs, sent with one user's token. */
export type UserRest = Pick<REST, 'get' | 'post' | 'put' | 'patch' | 'delete'>;

// a string argument against the real parameters renders the message in the compile error
type ScopedArgs<
    TScopes extends OAuthScope,
    TScope extends OAuthScope,
    TArgs extends unknown[] = []
> = TScope extends TScopes ? TArgs : [`This call needs the '${TScope}' scope. Add it to the client's scopes.`];

/**
 * Discord calls made as one user. The typed methods cover what the common scopes allow, and each one only
 * compiles when the client's scopes include the scope it needs. The verbs reach every other route.
 *
 * @typeParam TScopes - The client's scopes.
 */
export interface UserCalls<TScopes extends OAuthScope = OAuthScope> extends UserRest {
    /** The user's own account. */
    user(): Promise<RESTGetAPICurrentUserResult>;
    /** The servers that the user is in. Needs the `guilds` scope. */
    guilds(
        ...args: ScopedArgs<TScopes, 'guilds', [query?: RESTGetAPICurrentUserGuildsQuery]>
    ): Promise<RESTGetAPICurrentUserGuildsResult>;
    /** The user's member object in one server. Needs the `guilds.members.read` scope. */
    guildMember(
        ...args: ScopedArgs<TScopes, 'guilds.members.read', [guildId: string]>
    ): Promise<RESTGetCurrentUserGuildMemberResult>;
    /** The accounts that the user connected on Discord, like GitHub. Needs the `connections` scope. */
    connections(...args: ScopedArgs<TScopes, 'connections'>): Promise<RESTGetAPICurrentUserConnectionsResult>;
}

// discord's access tokens last 7 days. refreshing 5 minutes early keeps a token from expiring while a
// request that uses it is on its way
const REFRESH_EARLY_MS = 300_000;

// the process that won a refresh race gets its 200 at about the same moment the loser gets its 400, and
// writes the new tokens to the store a few milliseconds later. 250ms is a guess that leaves room for a
// slow store
const RACE_WAIT_MS = 250;

/**
 * Discord's OAuth2 flow for one application, with each user's tokens kept encrypted in a store and
 * refreshed before they expire.
 *
 * `@seedcord/plugin-oauth`'s `OAuth` plugin builds one for you. Build your own when you want the calls
 * without attaching the plugin.
 *
 * @typeParam TScopes - The scopes from the options. Leave it out.
 * @example
 * ```ts
 * const oauth = new OAuthClient({
 *     rest: bot.rest,
 *     store: bot.kv.collection<string>('oauth-tokens'),
 *     clientId: bot.applicationId,
 *     clientSecret: Envapter.getRequired('DISCORD_CLIENT_SECRET'),
 *     redirectUri: new URL('oauth/callback', bot.url),
 *     scopes: ['guilds']
 * });
 *
 * const login = await oauth.exchange(code);
 * const guilds = await oauth.as(login.user.id).guilds();
 * ```
 */
export class OAuthClient<TScopes extends OAuthScope = OAuthScope> {
    readonly #rest: REST;
    readonly #clientId: string;
    readonly #redirectUri: string;
    readonly #scope: string;
    readonly #endpoint: TokenEndpoint;
    readonly #vault: TokenVault;

    constructor({ rest, store, clientId, clientSecret, redirectUri, scopes }: OAuthClientOptions<TScopes>) {
        this.#rest = rest;
        this.#clientId = clientId;
        this.#redirectUri = String(redirectUri);
        // the tokens are saved under the user's id, and discord only returns the user with identify
        this.#scope = [...new Set<OAuthScope>(['identify', ...scopes])].join(' ');
        this.#endpoint = new TokenEndpoint(rest, clientId, clientSecret);
        this.#vault = new TokenVault(store, clientId, clientSecret);
    }

    /** Builds the link that sends a visitor to Discord's consent screen. */
    public authorizeUrl({ state, codeChallenge }: AuthorizeUrlOptions): string {
        const url = new URL(OAuth2Routes.authorizationURL);
        url.search = new URLSearchParams({
            client_id: this.#clientId,
            redirect_uri: this.#redirectUri,
            response_type: 'code',
            scope: this.#scope,
            state,
            ...(codeChallenge !== undefined && { code_challenge: codeChallenge, code_challenge_method: 'S256' })
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

        await this.#save(user.id, granted);
        // justified: discord answers with its own scope names
        return { user, scopes: granted.scope.split(' ') as OAuthScope[] };
    }

    /**
     * Calls Discord as a user who logged in. `user()`, `guilds()`, `guildMember()`, and `connections()`
     * return typed results. The verbs take what `bot.rest`'s take and reach every other route.
     *
     * Each call reads the user's tokens and refreshes them first when they're about to expire.
     *
     * @throws A **SeedcordError** with the code `PluginOAuthLoginNeeded` from any call when the user never
     * logged in or their grant ended. Send them through the login again.
     * @example
     * ```ts
     * const guilds = await oauth.as(userId).guilds({ with_counts: true });
     * const entitlements = await oauth.as(userId).get('/users/@me/entitlements');
     * ```
     */
    public as(userId: string): UserCalls<TScopes> {
        const call =
            (verb: keyof UserRest) =>
            async (route: `/${string}`, options: RequestData = {}): Promise<unknown> =>
                this.#rest[verb](route, { ...options, ...bearer(await this.#accessToken(userId), options.headers) });
        // justified: discord documents each route's body, and the caller's annotation picks the matching type
        const get = async <TResult>(route: `/${string}`, options?: RequestData): Promise<TResult> =>
            (await call('get')(route, options)) as TResult;

        const calls: UserCalls = {
            get: call('get'),
            post: call('post'),
            put: call('put'),
            patch: call('patch'),
            delete: call('delete'),
            user: async () => get(Routes.user('@me')),
            guilds: async (query) => get(Routes.userGuilds(), { query: makeURLSearchParams(query) }),
            guildMember: async (guildId) => get(Routes.userGuildMember(guildId)),
            connections: async () => get(Routes.userConnections())
        };
        // justified: TScopes only narrows which of these calls compile for the caller
        return calls as UserCalls<TScopes>;
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

    async #accessToken(userId: string): Promise<string> {
        const saved = await this.#vault.read(userId);
        if (!saved) throw new SeedcordError(SeedcordErrorCode.PluginOAuthLoginNeeded, [userId]);
        if (saved.expiresAt - REFRESH_EARLY_MS > Date.now()) return saved.accessToken;
        const refreshed = await this.#refresh(userId, saved);
        return refreshed.accessToken;
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
            scopes: granted.scope.split(' ')
        };
        await this.#vault.save(userId, tokens);
        return tokens;
    }
}

// auth: false stops @discordjs/rest from sending the bot token, and from clearing it when a user's call gets a 401
function bearer(accessToken: string, headers?: Record<string, string>): Pick<RequestData, 'auth' | 'headers'> {
    return { auth: false, headers: { ...headers, Authorization: `Bearer ${accessToken}` } };
}
