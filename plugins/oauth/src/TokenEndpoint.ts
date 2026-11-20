import { DiscordAPIError } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import type { REST } from '@discordjs/rest';
import type {
    RESTPostOAuth2AccessTokenResult,
    RESTPostOAuth2AccessTokenWithBotAndGuildsAndWebhookIncomingScopeResult
} from 'discord-api-types/v10';
import type { Simplify } from 'type-fest';

// what a code exchange answers. `guild` is there for a login with the bot scope, and `webhook` for one
// with webhook.incoming
type ExchangeResult = Simplify<
    RESTPostOAuth2AccessTokenResult &
        Partial<Pick<RESTPostOAuth2AccessTokenWithBotAndGuildsAndWebhookIncomingScopeResult, 'guild' | 'webhook'>>
>;

// discord's two token routes. /oauth2/token trades a login code for tokens and refreshes them, and
// /oauth2/token/revoke ends a grant.
//
// these calls aren't made like the bot's other calls. they're sent as the app, with
// the client id and secret, and discord takes them as a form.
//
// it's also the one place that reads `invalid_grant`. discord answers that for a code that was used,
// expired, or made up, and for a refresh token that was already used or whose grant ended. exchange() and
// refresh() give undefined for it and throw for anything else.

interface CodeExchange {
    code: string;
    redirectUri: string;
    // only for a flow that sent a code_challenge. discord refuses that exchange without it
    codeVerifier?: string | undefined;
}

export class TokenEndpoint {
    private readonly authorization: string;

    constructor(
        private readonly rest: REST,
        clientId: string,
        clientSecret: string
    ) {
        this.authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    }

    public async exchange({ code, redirectUri, codeVerifier }: CodeExchange): Promise<ExchangeResult | undefined> {
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
