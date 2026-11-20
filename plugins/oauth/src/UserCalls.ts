import type { REST } from '@discordjs/rest';
import type {
    APIGuildMember,
    OAuth2Scopes,
    RESTGetAPICurrentUserApplicationRoleConnectionResult,
    RESTGetAPICurrentUserConnectionsResult,
    RESTGetAPICurrentUserGuildsQuery,
    RESTGetAPICurrentUserGuildsResult,
    RESTGetAPICurrentUserResult,
    RESTGetCurrentUserGuildMemberResult,
    RESTPutAPICurrentUserApplicationRoleConnectionJSONBody,
    RESTPutAPICurrentUserApplicationRoleConnectionResult,
    RESTPutAPIGuildMemberJSONBody
} from 'discord-api-types/v10';
import type { Except } from 'type-fest';

/**
 * One of the Discord OAuth2 scopes that a login can grant, like `'identify'` or `'guilds'`.
 *
 * `applications.commands.update` and `applications.commands.permissions.update` aren't in it. Discord
 * only grants those two through the client credentials grant, which doesn't involve a user.
 */
export type OAuthScope = Exclude<
    `${OAuth2Scopes}`,
    'applications.commands.update' | 'applications.commands.permissions.update'
>;

/** What {@link UserCalls.joinGuild} did. `added` is `false` when the user was already in the server. */
export type GuildJoin = { added: true; member: APIGuildMember } | { added: false };

/** What {@link UserCalls.joinGuild} gives the new member: a nickname, roles, mute, and deafen. */
export type GuildJoinOptions = Except<RESTPutAPIGuildMemberJSONBody, 'access_token'>;

/** `bot.rest`'s `get`, `post`, `put`, `patch`, and `delete`, sent with one user's token. */
export type UserRest = Pick<REST, 'get' | 'post' | 'put' | 'patch' | 'delete'>;

// the string is never a real argument. it's the parameter type because typescript prints it in the
// compile error
type ScopedArgs<
    TAllowed extends OAuthScope,
    TScope extends OAuthScope,
    TArgs extends unknown[] = []
> = TScope extends TAllowed ? TArgs : [`This call needs the '${TScope}' scope. Add it to scopes or extraScopes.`];

// only a scope from `scopes` is on every login. a user may not have granted one from `extraScopes` yet
type ScopedResult<TScopes extends OAuthScope, TScope extends OAuthScope, TResult> = Promise<
    TScope extends TScopes ? TResult : TResult | undefined
>;

/**
 * Discord calls made as one user.
 *
 * Each typed method needs one scope. With that scope in the client's `scopes`, it resolves to the result.
 * With it in `extraScopes`, it resolves to `undefined` for a user who hasn't granted it yet. With it in
 * neither, the call doesn't compile.
 *
 * `get`, `post`, `put`, `patch`, and `delete` reach every other route and don't check scopes.
 *
 * @typeParam TScopes - The client's `scopes`.
 * @typeParam TExtra - The client's `extraScopes`.
 */
export interface UserCalls<TScopes extends OAuthScope = never, TExtra extends OAuthScope = never> extends UserRest {
    /** The user's own account. */
    user(): Promise<RESTGetAPICurrentUserResult>;
    /** The servers that the user is in. Needs the `guilds` scope. */
    guilds(
        ...args: ScopedArgs<TScopes | TExtra, 'guilds', [query?: RESTGetAPICurrentUserGuildsQuery]>
    ): ScopedResult<TScopes, 'guilds', RESTGetAPICurrentUserGuildsResult>;
    /** The user's member object in one server. Needs the `guilds.members.read` scope. */
    guildMember(
        ...args: ScopedArgs<TScopes | TExtra, 'guilds.members.read', [guildId: string]>
    ): ScopedResult<TScopes, 'guilds.members.read', RESTGetCurrentUserGuildMemberResult>;
    /** The accounts that the user connected on Discord, like GitHub. Needs the `connections` scope. */
    connections(
        ...args: ScopedArgs<TScopes | TExtra, 'connections'>
    ): ScopedResult<TScopes, 'connections', RESTGetAPICurrentUserConnectionsResult>;
    /**
     * Adds the user to a server that the bot is in. Needs the `guilds.join` scope, and the bot needs the
     * Create Invite permission there.
     */
    joinGuild(
        ...args: ScopedArgs<TScopes | TExtra, 'guilds.join', [guildId: string, options?: GuildJoinOptions]>
    ): ScopedResult<TScopes, 'guilds.join', GuildJoin>;
    /** What the application has stored for the user's Linked Roles. Needs the `role_connections.write` scope. */
    roleConnection(
        ...args: ScopedArgs<TScopes | TExtra, 'role_connections.write'>
    ): ScopedResult<TScopes, 'role_connections.write', RESTGetAPICurrentUserApplicationRoleConnectionResult>;
    /**
     * Replaces what the application has stored for the user's Linked Roles. Needs the
     * `role_connections.write` scope. Discord stores a value it's given without checking it against the
     * record's type.
     */
    setRoleConnection(
        ...args: ScopedArgs<
            TScopes | TExtra,
            'role_connections.write',
            [connection: RESTPutAPICurrentUserApplicationRoleConnectionJSONBody]
        >
    ): ScopedResult<TScopes, 'role_connections.write', RESTPutAPICurrentUserApplicationRoleConnectionResult>;
}
