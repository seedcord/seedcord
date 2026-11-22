import { REST } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { TokenEndpoint } from '#src/TokenEndpoint';

import { fakeDiscord, WEEK_SECONDS } from './fakeDiscord';

import type { SeenRequest } from './fakeDiscord';

const APP_ID = '1564002376115949650';
const SECRET = 'client-secret';
const BASIC = `Basic ${btoa(`${APP_ID}:${SECRET}`)}`;

const GRANTED = {
    token_type: 'Bearer',
    access_token: 'access-1',
    refresh_token: 'refresh-1',
    expires_in: WEEK_SECONDS,
    scope: 'identify guilds'
};

const refusal = (error: string): { status: number; json: { error: string } } => ({ status: 400, json: { error } });

async function endpointAgainst(reply: Parameters<typeof fakeDiscord>[0]): Promise<{
    endpoint: TokenEndpoint;
    rest: REST;
    requests: SeenRequest[];
}> {
    const discord = await fakeDiscord(reply);
    const rest = new REST({ api: discord.api }).setToken('bot-token');
    return { endpoint: new TokenEndpoint(rest, APP_ID, SECRET), rest, requests: discord.requests };
}

function formOf(request: SeenRequest | undefined): Record<string, string> {
    return Object.fromEntries(new URLSearchParams(request?.body));
}

describe('TokenEndpoint', () => {
    it("exchanges a code as the app, without the bot's token", async () => {
        const { endpoint, requests } = await endpointAgainst(() => ({ json: GRANTED }));

        const tokens = await endpoint.exchange({ code: 'the-code', redirectUri: 'https://bot.test/oauth/callback' });

        expect(tokens).toEqual(GRANTED);
        expect(requests).toHaveLength(1);
        expect(requests[0]).toMatchObject({ method: 'POST', route: '/oauth2/token' });
        expect(requests[0]?.headers.authorization).toBe(BASIC);
        expect(requests[0]?.headers['content-type']).toBe('application/x-www-form-urlencoded');
        expect(formOf(requests[0])).toEqual({
            grant_type: 'authorization_code',
            code: 'the-code',
            redirect_uri: 'https://bot.test/oauth/callback'
        });
    });

    it('sends the PKCE verifier with the code', async () => {
        const { endpoint, requests } = await endpointAgainst(() => ({ json: GRANTED }));

        await endpoint.exchange({ code: 'c', redirectUri: 'https://bot.test/cb', codeVerifier: 'the-verifier' });

        expect(formOf(requests[0]).code_verifier).toBe('the-verifier');
    });

    it('refreshes with the refresh token', async () => {
        const { endpoint, requests } = await endpointAgainst(() => ({ json: GRANTED }));

        expect(await endpoint.refresh('refresh-0')).toEqual({ kind: 'granted', grant: GRANTED });
        expect(requests[0]?.headers.authorization).toBe(BASIC);
        expect(formOf(requests[0])).toEqual({ grant_type: 'refresh_token', refresh_token: 'refresh-0' });
    });

    it('resolves to undefined for a code that Discord answers invalid_grant to', async () => {
        const { endpoint } = await endpointAgainst(() => refusal('invalid_grant'));

        expect(await endpoint.exchange({ code: 'used', redirectUri: 'https://bot.test/cb' })).toBeUndefined();
    });

    it('throws when Discord refuses a code for any other reason', async () => {
        const { endpoint } = await endpointAgainst(() => refusal('invalid_scope'));

        await expect(endpoint.exchange({ code: 'c', redirectUri: 'https://bot.test/cb' })).rejects.toMatchObject({
            code: 'invalid_scope'
        });
    });

    it.each([
        ['invalid_grant', true],
        ['invalid_request', false]
    ])('reports a refresh that Discord answers %s to as refused', async (error, invalidGrant) => {
        const { endpoint } = await endpointAgainst(() => refusal(error));

        expect(await endpoint.refresh('used')).toMatchObject({ kind: 'refused', invalidGrant, error: { code: error } });
    });

    it("throws with the fix when Discord refuses the client secret, and keeps the bot's token set", async () => {
        const { endpoint, rest, requests } = await endpointAgainst((request) =>
            request.route === '/oauth2/token' ? { status: 401, json: { error: 'invalid_client' } } : {}
        );

        await expect(endpoint.refresh('refresh-0')).rejects.toMatchObject({
            code: SeedcordErrorCode.PluginOAuthSecretRefused
        });

        await rest.get('/applications/@me');
        expect(requests[1]?.headers.authorization).toBe('Bot bot-token');
    });

    it('revokes a token as the app', async () => {
        const { endpoint, requests } = await endpointAgainst(() => ({}));

        await endpoint.revoke('refresh-1');

        expect(requests[0]).toMatchObject({ method: 'POST', route: '/oauth2/token/revoke' });
        expect(requests[0]?.headers.authorization).toBe(BASIC);
        expect(formOf(requests[0])).toEqual({ token: 'refresh-1' });
    });
});
