import { MemoryDriver } from '@seedcord/core';
import { keepRequestOpenFor } from '@seedcord/core/internal';
import { Plugin } from '@seedcord/core/plugin';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { OAuthClient } from '@seedcord/plugin-oauth';
import { Routes } from 'discord-api-types/v10';
import { Converters, Envapter } from 'envapt';

import { RecordSet } from './RecordSet';

import type { LinkedRoleRecords, RecordProblems, RoleConnection } from './LinkedRoleRecord';
import type { LinkedRolesResult } from './LinkedRolesResult';
import type { CoreBase } from '@seedcord/core';
import type { LoginOutcome, OAuthScope, UserCalls } from '@seedcord/plugin-oauth';
import type { APIUser, RESTPatchCurrentApplicationJSONBody } from 'discord-api-types/v10';
import type { ExcludeStrict, Promisable } from 'type-fest';

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
     * Saves each user's tokens in your bot's `kv` so you can update their values later. Your `kv` needs
     * a driver that saves to a file or a database for it. Leave it out when a user's values never change
     * after they connect.
     */
    keepTokens?: TKeep | undefined;
    /**
     * Returns a user's value for every record. Return a string to refuse them, like when they have to do
     * something in your bot first. The plugin shows them the string and doesn't write anything.
     *
     * @example
     * ```ts
     * // counts merged pull requests for the GitHub account on the person's Discord profile.
     * // reading their linked accounts needs scopes: ['connections']
     * values: async ({ asUser }) => {
     *     const accounts = await asUser.connections();
     *     const github = accounts.find((account) => account.type === ConnectionService.GitHub && account.verified);
     *     if (!github) return 'Connect your GitHub account on Discord, then try again.';
     *     return { platformUsername: github.name, metadata: { merged_prs: await mergedPullRequests(github.name) } };
     * }
     * ```
     */
    values(connecting: ConnectingUser<TScopes>): Promisable<RoleConnection<TRecords> | string>;
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
    onResult?: ((result: LinkedRolesResult, request: Request) => Promisable<Response>) | undefined;
}

const CLIENT_SECRET_KEY = 'DISCORD_CLIENT_SECRET';
// two deployments of one application overwrite each other's verification URL. once this much time
// has passed, a deployment's next start sets its own again
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
} satisfies Record<ExcludeStrict<LinkedRolesResult['kind'], 'refused'>, { status: number; text: string }>;

function plainPage(result: LinkedRolesResult): Response {
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

    /**
     * Returns the plugin class to attach, with your options in it. Attaching `LinkedRoles` directly
     * doesn't compile because it's abstract.
     *
     * @example
     * ```ts
     * seedcord.attach(
     *     'linkedRoles',
     *     LinkedRoles.with({
     *         records: {
     *             level: {
     *                 type: RecordType.IntegerGreaterThanOrEqual,
     *                 name: 'Level',
     *                 description: 'Your level'
     *             }
     *         },
     *         values: async ({ user }) => ({ metadata: { level: await levels.get(user.id) } })
     *     })
     * );
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
        void this.#clientSecret();

        const problem = this.#records().firstProblem();
        if (problem !== undefined) this.rejectOptions(problem);

        if (this.#keepsTokens && this.kv.driver instanceof MemoryDriver) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginOAuthTokensInMemory, [this.constructor.name]);
        }
    }

    /**
     * Registers your records with Discord and sets the application's Linked Roles Verification URL to
     * {@link LinkedRoles.verifyUrl}. It also logs the callback address while it's missing under Redirects
     * on your application's OAuth2 page since only you can add it there.
     *
     * A later start skips those calls unless your records or `server.url` changed, or the last time it
     * made them was more than a day ago. Every start makes them while the callback address is missing.
     */
    public override async ready(): Promise<void> {
        const portal = this.kv.collection<string>('portal');
        try {
            const client = this.#client();
            const records = this.#records().recordsBody();
            const verifyUrl = client.loginUrl();
            const wanted = JSON.stringify({ records, verifyUrl, callback: client.redirectUri });
            if ((await portal.get('synced')) === wanted) return;

            await this.core.rest.put(Routes.applicationRoleConnectionMetadata(this.core.applicationId), {
                body: records
            });
            await this.core.rest.patch(Routes.currentApplication(), {
                body: { role_connections_verification_url: verifyUrl } satisfies RESTPatchCurrentApplicationJSONBody
            });
            if (!(await client.isRedirectListed())) {
                this.logger.utils.block(
                    'Nobody can connect until this address is under Redirects on your OAuth2 page',
                    [paint.sky(client.redirectUri)],
                    'warn'
                );
                return;
            }
            await portal.set('synced', wanted, RESYNC_MS);
        } catch (error) {
            // only logging here because if we throw on edge it'd break every interaction
            this.logger.error("Couldn't set up Linked Roles on Discord", error);
        }
    }

    /**
     * The address that starts the flow for a user. Discord opens it from a server's Linked Roles menu.
     * Put it in your own command too because that menu doesn't run it again for someone who is
     * already connected.
     */
    public verifyUrl(): string {
        return this.#client().loginUrl();
    }

    public override fetch(request: Request): Promise<Response | undefined> {
        return this.#client().fetch(request, async (outcome) => {
            const result = await this.#resultOf(outcome);
            if (result.kind === 'failed') this.logger.error("Couldn't connect a user", result.error);
            return (await this.options.onResult?.(result, request)) ?? plainPage(result);
        });
    }

    async #resultOf(outcome: LoginOutcome): Promise<LinkedRolesResult> {
        // the verify link never lists scopes. this is a visitor who added `?scopes=` to it by hand
        if (outcome.kind === 'unlisted') return { kind: 'invalid' };
        if (outcome.kind !== 'login') return outcome;

        const { user } = outcome.login;
        try {
            const refusal = await this.#connect(user);
            return refusal === undefined ? { kind: 'connected', user } : { kind: 'refused', user, message: refusal };
        } catch (error) {
            return { kind: 'failed', error };
        } finally {
            if (!this.#keepsTokens) await this.#client().forget(user.id);
        }
    }

    // resolves to the string when `values` refuses the user, and to undefined after a write
    async #connect(user: APIUser): Promise<string | undefined> {
        const asUser = this.#client().as(user.id);
        const returned = await this.options.values({
            user,
            // justified: it's the same object for any scopes. `TScopes` only limits which calls compile
            // for the bot author
            asUser: asUser as UserCalls<TScopes | 'role_connections.write'>
        });
        // a string is the bot author's message for someone they refuse, like 'Use the bot once first.'
        if (typeof returned === 'string') return returned;
        await asUser.setRoleConnection(this.#records().connectionBody(returned));
        return undefined;
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
            clientSecret: this.#clientSecret(),
            baseUrl: this.core.url,
            routes: { login: 'linked-roles/verify', callback: 'linked-roles/callback' },
            scopes: ['role_connections.write', ...(this.options.scopes ?? [])],
            keepOpen: keepRequestOpenFor
        });
        return this.#built;
    }

    // envapt throws on workers if you read before the bot binds its env, and plugins get built before that
    #clientSecret(): string {
        if (!Envapter.has(CLIENT_SECRET_KEY)) {
            throw new SeedcordError(SeedcordErrorCode.ConfigMissingEnv, [
                CLIENT_SECRET_KEY,
                "It's the client secret on your application's OAuth2 page in the Developer Portal."
            ]);
        }
        return Envapter.getRequired(CLIENT_SECRET_KEY, Converters.String);
    }
}
