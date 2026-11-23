import { MemoryDriver } from '@seedcord/core';
import { Plugin } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { Converters, Envapter } from 'envapt';

import { RecordSet } from './RecordSet';

import type { LinkedRoleRecords, RecordProblems, RoleConnection } from './LinkedRoleRecord';
import type { LinkedRolesResult } from './LinkedRolesResult';
import type { CoreBase } from '@seedcord/core';
import type { OAuthScope, UserCalls } from '@seedcord/plugin-oauth';
import type { APIUser } from 'discord-api-types/v10';
import type { Promisable } from 'type-fest';

/**
 * What your `values` gets: the user who is connecting, and Discord calls as them.
 *
 * @typeParam TScopes - The `scopes` you pass.
 */
export interface ConnectingUser<TScopes extends OAuthScope = never> {
    user: APIUser;
    /** Calls Discord as this user. A typed call like `connections()` needs its scope in your `scopes`. */
    discord: UserCalls<TScopes | 'role_connections.write'>;
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
     */
    values(connecting: ConnectingUser<TScopes>): Promisable<RoleConnection<TRecords> | string>;
    /**
     * Returns the page that a visitor gets after the callback route, for every `kind` of
     * {@link LinkedRolesResult}. Without it, they get a plain page that says what happened.
     */
    onResult?: ((result: LinkedRolesResult, request: Request) => Promisable<Response>) | undefined;
}

const CLIENT_SECRET_KEY = 'DISCORD_CLIENT_SECRET';

/**
 * Sets up Discord's Linked Roles for your bot. Attach what {@link LinkedRoles.with} returns.
 *
 * It reads the client secret from `DISCORD_CLIENT_SECRET`, and your bot's config needs `server.url`.
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
        void this.clientSecret();

        const problem = new RecordSet(this.options.records).firstProblem();
        if (problem !== undefined) this.rejectOptions(problem);

        if (this.options.keepTokens === true && this.kv.driver instanceof MemoryDriver) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginOAuthTokensInMemory, [this.constructor.name]);
        }
    }

    // envapt throws on workers if you read before the bot binds its env, and plugins get built before that
    private clientSecret(): string {
        if (!Envapter.has(CLIENT_SECRET_KEY)) {
            throw new SeedcordError(SeedcordErrorCode.ConfigMissingEnv, [
                CLIENT_SECRET_KEY,
                "It's the client secret on your application's OAuth2 page in the Developer Portal."
            ]);
        }
        return Envapter.getRequired(CLIENT_SECRET_KEY, Converters.String);
    }
}
