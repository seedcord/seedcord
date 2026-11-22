import { REST } from '@discordjs/rest';

import { OAuthClient } from '#src/OAuthClient';

import { fakeDiscord } from './fakeDiscord';

import type { TokenStore } from '#src/TokenVault';
import type { SeenRequest } from './fakeDiscord';

export const APP_ID = '1564002376115949650';
export const CLIENT_SECRET = 'client-secret';
export const USER = { id: '111', username: 'dhruv' };

export interface Discord {
    requests: SeenRequest[];
    // how many seconds the next tokens it grants last
    expiresIn: number;
    acceptedRefreshes: number;
    deadAccessTokens: Set<string>;
    // what a refresh with an old refresh token gets. real Discord answers invalid_request while the
    // refresh that used the token is still running, and invalid_grant after it
    usedRefreshTokenAnswer: 'invalid_grant' | 'invalid_request';
    // a refresh gets its answer once this settles
    refreshesWaitFor: Promise<unknown>;
    // client() keeps its tokens here unless it gets another store
    store: Map<string, string>;
    api: string;
    rest(): REST;
    client(store?: TokenStore): OAuthClient<'guilds', 'connections'>;
}

// acts like Discord for one user. every refresh token works once, each token it grants lasts `expiresIn`,
// and the tokens are numbered in the order it granted them: access-0 and refresh-0, then access-1
export async function discordGranting(expiresIn: number, scope = 'identify guilds'): Promise<Discord> {
    const live = { refreshToken: '', granted: 0 };
    const grant = (): object => {
        const number = live.granted++;
        live.refreshToken = `refresh-${number}`;
        return {
            token_type: 'Bearer',
            access_token: `access-${number}`,
            refresh_token: live.refreshToken,
            expires_in: discord.expiresIn,
            scope
        };
    };

    const server = await fakeDiscord(async ({ route, body, headers }) => {
        if (discord.deadAccessTokens.has(headers.authorization?.replace('Bearer ', '') ?? '')) {
            return { status: 401, json: { message: '401: Unauthorized', code: 0 } };
        }
        const form = new URLSearchParams(body);
        if (route === '/oauth2/token' && form.get('grant_type') === 'authorization_code') return { json: grant() };
        if (route === '/oauth2/token') {
            await discord.refreshesWaitFor;
            if (form.get('refresh_token') !== live.refreshToken)
                return { status: 400, json: { error: discord.usedRefreshTokenAnswer } };
            discord.acceptedRefreshes++;
            return { json: grant() };
        }
        if (route === '/oauth2/@me')
            return { json: { user: scope.includes('identify') ? USER : undefined, scopes: scope.split(' ') } };
        return { json: [] };
    });

    const discord: Discord = {
        requests: server.requests,
        api: server.api,
        expiresIn,
        acceptedRefreshes: 0,
        deadAccessTokens: new Set(),
        usedRefreshTokenAnswer: 'invalid_grant',
        refreshesWaitFor: Promise.resolve(),
        store: new Map(),
        rest: () => new REST({ api: server.api }).setToken('bot-token'),
        client: (store = discord.store) =>
            new OAuthClient({
                rest: discord.rest(),
                store,
                clientId: APP_ID,
                clientSecret: CLIENT_SECRET,
                baseUrl: 'https://bot.test/',
                scopes: ['guilds'],
                extraScopes: ['connections']
            })
    };
    return discord;
}
