import { MemoryDriver } from '@seedcord/core';
import { keepRequestOpenFor } from '@seedcord/core/internal';
import { Plugin } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { OAuthClient } from '@seedcord/plugin-oauth';
import { discordClientSecret, warnUnlessRedirectListed } from '@seedcord/plugin-utils/oauth';
import { Routes } from 'discord-api-types/v10';

import { RecordSet } from './RecordSet';

import type { LinkedRoleRecords, RecordProblems, RoleConnection } from './LinkedRoleRecord';
import type { ConnectionResult, LinkedRolesResult } from './LinkedRolesResult';
import type { CoreBase, KvCollection } from '@seedcord/core';
import type { LoginOutcome, OAuthScope, UserCalls } from '@seedcord/plugin-oauth';
import type { APIUser, RESTPatchCurrentApplicationJSONBody } from 'discord-api-types/v10';
import type { ExcludeStrict, If, Promisable } from 'type-fest';

/**
 * What your `values` gets about the person who is connecting.
 *
 * @typeParam TScopes - The `scopes` you pass.
 */
export interface ConnectingUser<TScopes extends OAuthScope = never> {
    /** Their Discord account. */
    user: APIUser;
    /**
     * Functions that call Discord's API with this person's own token, the one they approved on the consent
     * screen. `asUser.connections()` returns the accounts they linked on their Discord profile, like GitHub.
     * A call like that needs its scope in your `scopes`, or it doesn't compile.
     */
    asUser: UserCalls<TScopes | 'role_connections.write'>;
}

/** Return this from your `values` to refuse someone. */
export interface Refusal {
    /** What to tell them. The callback page shows it, and it's the `message` of a `refused` result. */
    refuse: string;
}

/**
 * What {@link LinkedRoles.with} takes.
 *
 * @typeParam TRecords - The `records` you pass.
 * @typeParam TScopes - The `scopes` you pass.
 * @typeParam TKeep - The `keepTokens` you pass.
 */
export interface LinkedRolesOptions<
    TRecords extends LinkedRoleRecords,
    TScopes extends OAuthScope = never,
    TKeep extends boolean = false
> {
    /** The values that a server can set role requirements on, by key. Discord takes 5 at most. */
    records: TRecords & RecordProblems<TRecords>;
    /**
     * Scopes to request when a user connects, like `'connections'` to read their GitHub account. The
     * plugin always adds `identify` and `role_connections.write`.
     */
    scopes?: readonly TScopes[] | undefined;
    /**
     * Saves each user's tokens in your bot's `kv` so you can update their values later. This needs a `kv`
     * driver that saves to a file or a database. Leave it out when a user's values never change after
     * they connect.
     */
    keepTokens?: TKeep | undefined;
    /**
     * Returns a user's value for every record. Return `{ refuse: 'your message' }` to refuse them, like
     * when they have to do something in your bot first. The plugin shows them the message and doesn't write
     * anything.
     *
     * @example
     * ```ts
     * // counts merged pull requests for the GitHub account on the person's Discord profile.
     * // reading their linked accounts needs scopes: ['connections']
     * values: async ({ asUser }) => {
     *     const accounts = await asUser.connections();
     *     const github = accounts.find((account) => account.type === ConnectionService.GitHub && account.verified);
     *     if (!github) return { refuse: 'Connect your GitHub account on Discord, then try again.' };
     *     return { platformUsername: github.name, metadata: { merged_prs: await mergedPullRequests(github.name) } };
     * }
     * ```
     */
    values(connecting: ConnectingUser<TScopes>): Promisable<RoleConnection<TRecords> | Refusal>;
    /**
     * Returns the page that a visitor gets after the callback route, for every `kind` of
     * {@link LinkedRolesResult}. Without it, they get a plain page that says what happened.
     *
     * @example
     * ```ts
     * // sends every visitor to your own site, with how it ended in the address
     * onResult: (result) => Response.redirect(`https://example.com/linked?result=${result.kind}`)
     * ```
     */
    onResult?: ((result: LinkedRolesResult<TRecords>, request: Request) => Promisable<Response>) | undefined;
}

type SavedTokenMethod = 'push' | 'clear';

// without `keepTokens: true` the parameter's type is this sentence. no user id fits it, and typescript
// prints it in the error
type SavedTokenUserId<TKeep extends boolean, TMethod extends SavedTokenMethod> = If<
    TKeep,
    string,
    `${TMethod}() needs the saved tokens. Set keepTokens: true in LinkedRoles.with().`
>;

// someone can change the records or the verification URL in the portal. the first start after this
// long sets them again
const RESYNC_MS = 24 * 60 * 60 * 1000;

const BAD_REQUEST = 400;
const SERVER_ERROR = 500;

const PLAIN_PAGES = {
    connected: { status: 200, text: "You're connected. You can close this tab." },
    denied: { status: BAD_REQUEST, text: "You cancelled on Discord and aren't connected. You can close this tab." },
    invalid: { status: BAD_REQUEST, text: "This link didn't finish. Open it again from Discord." },
    failed: {
        status: SERVER_ERROR,
        text: "We couldn't connect you because of a problem on our side. Try again in a bit."
    }
} satisfies Record<
    ExcludeStrict<LinkedRolesResult<LinkedRoleRecords>['kind'], 'refused'>,
    { status: number; text: string }
>;

function plainPage(result: LinkedRolesResult<LinkedRoleRecords>): Response {
    if (result.kind === 'refused') return new Response(result.message);
    const { status, text } = PLAIN_PAGES[result.kind];
    return new Response(text, { status });
}

/**
 * Sets up Discord's Linked Roles for your bot. Attach what {@link LinkedRoles.with} returns.
 *
 * It serves `linked-roles/verify` and `linked-roles/callback` under your bot's `server.url`. Add the
 * callback's address under Redirects on your application's OAuth2 page. The plugin logs the exact address
 * at startup while it's missing.
 *
 * It reads the client secret from `DISCORD_CLIENT_SECRET`.
 *
 * @typeParam TRecords - The `records` from the options. Leave it out.
 * @typeParam TScopes - The `scopes` from the options. Leave it out.
 * @typeParam TKeep - The `keepTokens` from the options. Leave it out.
 */
export abstract class LinkedRoles<
    TRecords extends LinkedRoleRecords,
    TScopes extends OAuthScope = never,
    TKeep extends boolean = false
> extends Plugin {
    protected abstract readonly options: LinkedRolesOptions<TRecords, TScopes, TKeep>;

    #recordSet?: RecordSet<TRecords> | undefined;
    // typed with every scope because typescript can't resolve a typed call's arguments while `TScopes`
    // is still a type parameter
    #built?: OAuthClient<OAuthScope> | undefined;
    // callbacks in progress, by user id. without `keepTokens` two of them for one user share a token,
    // and deleting it when the first one ends makes the other fail
    readonly #visiting = new Map<string, number>();

    /**
     * Returns the plugin class to attach, with your options in it. Attaching `LinkedRoles` directly
     * doesn't compile because it's abstract.
     *
     * @example
     * ```ts
     * const Ranked = LinkedRoles.with({
     *     records: {
     *         matches_won: {
     *             type: RecordType.IntegerGreaterThanOrEqual,
     *             name: 'Matches won',
     *             description: 'or more matches won'
     *         }
     *     },
     *     // `matches` is your own code, with what your game has for each Discord user
     *     values: async ({ user }) => ({ metadata: { matches_won: await matches.wonBy(user.id) } })
     * });
     *
     * seedcord.attach('linkedRoles', Ranked);
     * ```
     */
    public static with<
        const TRecords extends LinkedRoleRecords,
        TScopes extends OAuthScope = never,
        TKeep extends boolean = false
    >(
        options: LinkedRolesOptions<TRecords, TScopes, TKeep>
    ): new (host: CoreBase) => LinkedRoles<TRecords, TScopes, TKeep> {
        const Attached = class extends LinkedRoles<TRecords, TScopes, TKeep> {
            protected readonly options = options;
        };
        // the logger prints `constructor.name`
        Object.defineProperty(Attached, 'name', { value: 'LinkedRoles' });
        return Attached;
    }

    /**
     * @throws A **SeedcordError** when `server.url` or `DISCORD_CLIENT_SECRET` isn't set.
     * @throws A **SeedcordTypeError** when the records break one of Discord's limits.
     * @throws A **SeedcordTypeError** when `keepTokens` is on and the bot's `kv` keeps everything in memory.
     */
    public init(): void {
        // read here only to fail at startup when one is missing. otherwise the first visitor gets an error
        void this.core.url;
        void discordClientSecret();

        const problem = this.#records().firstProblem();
        if (problem !== undefined) this.rejectOptions(problem);

        if (this.#keepsTokens && this.kv.driver instanceof MemoryDriver) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginOAuthTokensInMemory, [this.constructor.name]);
        }
    }

    /**
     * Registers your records with Discord and sets the application's Linked Roles Verification URL to
     * {@link LinkedRoles.verifyUrl}. A later start skips those calls unless your records or `server.url`
     * changed, or the last time it made them was more than a day ago.
     *
     * If the callback address isn't under Redirects on your application's OAuth2 page, it logs the
     * address. Only you can add it there.
     */
    public override async ready(): Promise<void> {
        const portal = this.kv.collection<string>('portal');
        try {
            const client = this.#client();
            await this.#syncRecords(portal, client.loginUrl());
            await warnUnlessRedirectListed(
                client,
                portal,
                this.logger,
                'Nobody can connect until this address is under Redirects on your OAuth2 page'
            );
        } catch (error) {
            // only logging here because if we throw on edge it'd break every interaction
            this.logger.error("Couldn't set up Linked Roles on Discord", error);
        }
    }

    async #syncRecords(portal: KvCollection<string>, verifyUrl: string): Promise<void> {
        const { applicationId } = this.core;
        const records = this.#records().recordsBody();
        const wanted = JSON.stringify({ applicationId, records, verifyUrl });
        if ((await portal.get('synced')) === wanted) return;

        await this.core.rest.put(Routes.applicationRoleConnectionMetadata(applicationId), { body: records });
        await this.core.rest.patch(Routes.currentApplication(), {
            body: { role_connections_verification_url: verifyUrl } satisfies RESTPatchCurrentApplicationJSONBody
        });
        await portal.set('synced', wanted, RESYNC_MS);
    }

    /**
     * The address that starts the flow for a user. Discord opens it from a server's Linked Roles menu.
     * Also reply with it from a command of your own because that menu doesn't open it again for someone
     * who is already connected.
     */
    public verifyUrl(): string {
        return this.#client().loginUrl();
    }

    /**
     * Runs your `values` again for a user who connected, and writes what it returns. Call it when
     * something a role depends on changes, like after a match in your game.
     *
     * It resolves to a {@link ConnectionResult}. After a write, its `kind` is `'connected'` and its
     * `connection` holds the values sent to Discord. When your `values` refused this user, its `kind` is
     * `'refused'` and it has the `message`.
     *
     * @throws Whatever your `values` throws.
     * @throws A **SeedcordError** with the code `PluginOAuthLoginNeeded` when the user never connected,
     * or took your application off their account since. They have to open {@link LinkedRoles.verifyUrl} again.
     * @throws A **SeedcordTypeError** with the code `PluginLinkedRolesValueRejected` when your `values`
     * returns a value that doesn't fit its record, or a key that isn't in `records`.
     * @throws A **SeedcordRangeError** with the code `PluginLinkedRolesValueRejected` when `platformName`
     * or `platformUsername` is longer than Discord takes.
     * @throws A **SeedcordTypeError** with the code `PluginLinkedRolesTokensNotKept` when the plugin doesn't
     * have `keepTokens: true`.
     */
    public async push(userId: SavedTokenUserId<TKeep, 'push'>): Promise<ConnectionResult<TRecords>> {
        const asUser = this.#asUserWithSavedTokens('push', userId);
        return this.#connect(await asUser.user());
    }

    /**
     * Empties the values that Discord has for a user. Use it for a user who shouldn't keep the roles that
     * depend on your records. The plugin keeps their tokens, and a later {@link LinkedRoles.push} writes
     * their values again.
     *
     * A cleared user can open {@link LinkedRoles.verifyUrl} again, and the plugin then writes what your
     * `values` returns for them. To keep them out, you have to refuse them in `values`.
     *
     * @throws A **SeedcordError** with the code `PluginOAuthLoginNeeded` when the user never connected,
     * or took your application off their account since.
     * @throws A **SeedcordTypeError** with the code `PluginLinkedRolesTokensNotKept` when the plugin doesn't
     * have `keepTokens: true`.
     */
    public async clear(userId: SavedTokenUserId<TKeep, 'clear'>): Promise<void> {
        await this.#asUserWithSavedTokens('clear', userId).setRoleConnection({});
    }

    public override fetch(request: Request): Promise<Response | undefined> {
        return this.#client().fetch(request, async (outcome) => {
            const result = await this.#resultOf(outcome);
            if (result.kind === 'failed') this.logger.error("Couldn't connect a user", result.error);
            return (await this.options.onResult?.(result, request)) ?? plainPage(result);
        });
    }

    async #resultOf(outcome: LoginOutcome): Promise<LinkedRolesResult<TRecords>> {
        // the verify link never lists scopes. this is a visitor who added `?scopes=` to it by hand
        if (outcome.kind === 'unlisted') return { kind: 'invalid' };
        if (outcome.kind !== 'login') return outcome;

        const { user } = outcome.login;
        this.#visiting.set(user.id, (this.#visiting.get(user.id) ?? 0) + 1);
        try {
            return await this.#connect(user);
        } catch (error) {
            return { kind: 'failed', error };
        } finally {
            await this.#visitEnded(user.id);
        }
    }

    async #visitEnded(userId: string): Promise<void> {
        const stillVisiting = (this.#visiting.get(userId) ?? 1) - 1;
        if (stillVisiting > 0) {
            this.#visiting.set(userId, stillVisiting);
            return;
        }
        this.#visiting.delete(userId);
        if (!this.#keepsTokens) await this.#client().forget(userId);
    }

    async #connect(user: APIUser): Promise<ConnectionResult<TRecords>> {
        const asUser = this.#client().as(user.id);
        const returned = await this.options.values({
            user,
            // justified: it's the same object for any scopes. `TScopes` only limits which calls compile
            // for the bot author
            asUser: asUser as UserCalls<TScopes | 'role_connections.write'>
        });
        if ('refuse' in returned) return { kind: 'refused', user, message: returned.refuse };
        await asUser.setRoleConnection(this.#records().connectionBody(returned));
        return { kind: 'connected', user, connection: returned };
    }

    // the types refuse these calls without `keepTokens: true`, but not when the option is a boolean
    // variable
    #asUserWithSavedTokens(method: SavedTokenMethod, userId: string): UserCalls<OAuthScope> {
        if (!this.#keepsTokens) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginLinkedRolesTokensNotKept, [method]);
        }
        return this.#client().as(userId);
    }

    get #keepsTokens(): boolean {
        return this.options.keepTokens === true;
    }

    #records(): RecordSet<TRecords> {
        this.#recordSet ??= new RecordSet<TRecords>(this.options.records);
        return this.#recordSet;
    }

    // built on first use since a gateway bot only has its application id after it logs in
    #client(): OAuthClient<OAuthScope> {
        this.#built ??= new OAuthClient<OAuthScope>({
            rest: this.core.rest,
            // without keepTokens a login's tokens only have to last until its callback has written
            store: this.#keepsTokens ? this.kv.collection<string>('tokens') : new Map(),
            clientId: this.core.applicationId,
            clientSecret: discordClientSecret(),
            baseUrl: this.core.url,
            routes: { login: 'linked-roles/verify', callback: 'linked-roles/callback' },
            scopes: ['role_connections.write', ...(this.options.scopes ?? [])],
            keepOpen: keepRequestOpenFor
        });
        return this.#built;
    }
}
