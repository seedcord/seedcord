// compile-only. tc fails on any unused @ts-expect-error below.
import { expectTypeOf } from 'vite-plus/test';

import { OAuthClient } from '#src/OAuthClient';

import type { REST } from '@discordjs/rest';
import type {
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

function rejectsAScopeThatDiscordDoesNotHave(): void {
    // @ts-expect-error not one of Discord's scopes
    void new OAuthClient({ ...base, scopes: ['guild'] });
}

// a client typed without its scopes, like one a function takes as a parameter
function allowsEveryCallWhenTheScopesAreNotKnown(client: OAuthClient): void {
    const calls = client.as('111');

    void calls.connections();
    void calls.guildMember('222');
}

void typesTheCallsItsScopesAllow;
void rejectsACallWithoutItsScope;
void rejectsAScopeThatDiscordDoesNotHave;
void allowsEveryCallWhenTheScopesAreNotKnown;
