// compile-only. tc fails on any unused @ts-expect-error below.
import { expectTypeOf } from 'vite-plus/test';

import { OAuth } from '#src/OAuth';

import type { CompletedLogin } from '#src/LoginOutcome';
import type { AttachedPlugin, PluginHost } from '@seedcord/core/plugin';
import type { RESTGetAPICurrentUserConnectionsResult, RESTGetAPICurrentUserGuildsResult } from 'discord-api-types/v10';

declare const gateway: PluginHost<'gateway', 'server'>;
declare const edge: PluginHost<'http', 'edge'>;

function carriesTheScopesThroughAttach(): void {
    const attached = gateway.attach('oauth', OAuth.with({ scopes: ['guilds'], extraScopes: ['connections', 'bot'] }));
    // seedcord codegen types Core's member this way
    const oauth: AttachedPlugin<typeof attached.oauth> = attached.oauth;

    expectTypeOf(oauth.as('1').guilds()).resolves.toEqualTypeOf<RESTGetAPICurrentUserGuildsResult>();
    expectTypeOf(oauth.as('1').connections()).resolves.toEqualTypeOf<
        RESTGetAPICurrentUserConnectionsResult | undefined
    >();
    // @ts-expect-error guilds.join is in neither list
    void oauth.as('1').joinGuild('2');

    void oauth.loginUrl({ scopes: ['bot'], permissions: 8n, returnTo: '/servers' });
    // @ts-expect-error a link can only add a scope from extraScopes
    void oauth.loginUrl({ scopes: ['guilds.join'] });
    // @ts-expect-error only seedcord calls fetch
    void oauth.fetch;
}

function attachesOnEveryRuntime(): void {
    void edge.attach('oauth', OAuth.with());
    void gateway.attach('oauth', OAuth.with({ onLogin: (login) => Response.json(login.user) }));
}

function typesWhatOnLoginGets(): void {
    OAuth.with({
        onLogin: (login, request) => {
            expectTypeOf(login).toEqualTypeOf<CompletedLogin>();
            expectTypeOf(request).toEqualTypeOf<Request>();
            return new Response();
        }
    });
}

function refusesThePlainClass(): void {
    // @ts-expect-error OAuth is abstract. attach what OAuth.with() returns
    void gateway.attach('oauth', OAuth);
}

void carriesTheScopesThroughAttach;
void attachesOnEveryRuntime;
void typesWhatOnLoginGets;
void refusesThePlainClass;
