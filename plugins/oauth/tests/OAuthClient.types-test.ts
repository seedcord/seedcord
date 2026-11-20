// compile-only. tc fails on any unused @ts-expect-error below.
import { expectTypeOf } from 'vite-plus/test';

import { OAuthClient } from '#src/OAuthClient';

import type { GuildJoin } from '#src/UserCalls';
import type { REST } from '@discordjs/rest';
import type {
    APIApplicationRoleConnection,
    APIUser,
    RESTGetAPICurrentUserConnectionsResult,
    RESTGetAPICurrentUserGuildsResult,
    RESTGetCurrentUserGuildMemberResult
} from 'discord-api-types/v10';

declare const rest: REST;
const base = {
    rest,
    store: new Map<string, string>(),
    clientId: '1',
    clientSecret: 's',
    redirectUri: 'https://a.test'
};

function typesTheCallsItsScopesAllow(): void {
    const calls = new OAuthClient({ ...base, scopes: ['guilds', 'guilds.members.read', 'connections'] }).as('111');

    expectTypeOf(calls.user()).resolves.toEqualTypeOf<APIUser>();
    expectTypeOf(calls.guilds()).resolves.toEqualTypeOf<RESTGetAPICurrentUserGuildsResult>();
    expectTypeOf(calls.guilds({ with_counts: true })).resolves.toEqualTypeOf<RESTGetAPICurrentUserGuildsResult>();
    expectTypeOf(calls.guildMember('222')).resolves.toEqualTypeOf<RESTGetCurrentUserGuildMemberResult>();
    expectTypeOf(calls.connections()).resolves.toEqualTypeOf<RESTGetAPICurrentUserConnectionsResult>();
    expectTypeOf(calls.get('/users/@me/entitlements')).resolves.toBeUnknown();
}

function rejectsACallWithoutItsScope(): void {
    const calls = new OAuthClient({ ...base, scopes: ['guilds'] }).as('111');

    void calls.user();
    void calls.guilds();
    // @ts-expect-error the client's scopes don't include connections
    void calls.connections();
    // @ts-expect-error the client's scopes don't include guilds.members.read
    void calls.guildMember('222');
}

function admitsUndefinedForAnExtraScope(): void {
    const oauth = new OAuthClient({ ...base, scopes: ['guilds'], extraScopes: ['connections'] });
    const calls = oauth.as('111');

    expectTypeOf(calls.guilds()).resolves.toEqualTypeOf<RESTGetAPICurrentUserGuildsResult>();
    expectTypeOf(calls.connections()).resolves.toEqualTypeOf<RESTGetAPICurrentUserConnectionsResult | undefined>();
    // @ts-expect-error guilds.members.read is in neither list
    void calls.guildMember('222');

    void oauth.authorizeUrl({ state: 's', scopes: ['connections'] });
    // @ts-expect-error a link can only add a scope from extraScopes
    void oauth.authorizeUrl({ state: 's', scopes: ['guilds.join'] });
}

function typesOnlyUserWithoutScopes(): void {
    const calls = new OAuthClient(base).as('111');

    expectTypeOf(calls.user()).resolves.toEqualTypeOf<APIUser>();
    // @ts-expect-error a client without scopes only asks for identify
    void calls.guilds();
}

function typesTheCallsThatWrite(): void {
    const calls = new OAuthClient({ ...base, scopes: ['guilds.join'], extraScopes: ['role_connections.write'] }).as(
        '111'
    );

    expectTypeOf(calls.joinGuild('222', { nick: 'n' })).resolves.toEqualTypeOf<GuildJoin>();
    expectTypeOf(calls.roleConnection()).resolves.toEqualTypeOf<APIApplicationRoleConnection | undefined>();
    // @ts-expect-error the client puts the user's access token in the body
    void calls.joinGuild('222', { access_token: 't' });
}

function rejectsAScopeThatALoginCannotGrant(): void {
    // @ts-expect-error not one of Discord's scopes
    void new OAuthClient({ ...base, scopes: ['guild'] });
    // @ts-expect-error Discord only grants this one through client credentials
    void new OAuthClient({ ...base, scopes: ['applications.commands.update'] });
}

void typesTheCallsItsScopesAllow;
void rejectsACallWithoutItsScope;
void admitsUndefinedForAnExtraScope;
void typesOnlyUserWithoutScopes;
void typesTheCallsThatWrite;
void rejectsAScopeThatALoginCannotGrant;
