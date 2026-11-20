import { DiscordAPIError } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import type { REST } from '@discordjs/rest';
import type { RESTPostOAuth2AccessTokenResult } from 'discord-api-types/v10';

interface CodeExchange {
    code: string;
    redirectUri: string;
    // only for a flow that sent a code_challenge. discord refuses that exchange without it
    codeVerifier?: string | undefined;
}

// discord's token routes. every call here is made as the app, with the client id and secret, and never
// with the bot's token.
export class TokenEndpoint {
    private readonly authorization: string;

    constructor(
        private readonly rest: REST,
        clientId: string,
        clientSecret: string
    ) {
        this.authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    }

    public async exchange({
        code,
        redirectUri,
        codeVerifier
    }: CodeExchange): Promise<RESTPostOAuth2AccessTokenResult | undefined> {
        const fields = { grant_type: 'authorization_code', code, redirect_uri: redirectUri };
        return this.grant(codeVerifier === undefined ? fields : { ...fields, code_verifier: codeVerifier });
    }

    public async refresh(refreshToken: string): Promise<RESTPostOAuth2AccessTokenResult | undefined> {
        return this.grant({ grant_type: 'refresh_token', refresh_token: refreshToken });
    }

    // this ends every grant that the user gave the app, whichever token you pass
    public async revoke(token: string): Promise<void> {
        await this.post(Routes.oauth2TokenRevocation(), { token });
    }

    // undefined means discord answered invalid_grant. a code gets that when it was used, expired, or made
    // up. a refresh token gets it when it was already used, or when the user or a revoke ended the grant.
    private async grant(fields: Record<string, string>): Promise<RESTPostOAuth2AccessTokenResult | undefined> {
        try {
            // justified: discord documents this body for both grant types
            return (await this.post(Routes.oauth2TokenExchange(), fields)) as RESTPostOAuth2AccessTokenResult;
        } catch (error) {
            if (error instanceof DiscordAPIError && error.code === 'invalid_grant') return undefined;
            throw error;
        }
    }

    private async post(route: `/${string}`, fields: Record<string, string>): Promise<unknown> {
        return this.rest.post(route, {
            // auth: false stops @discordjs/rest from sending the bot token, and from clearing it on a 401
            auth: false,
            headers: { Authorization: this.authorization, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(fields),
            passThroughBody: true
        });
    }
}
