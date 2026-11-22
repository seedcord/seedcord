import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { discordErrorOf } from '@seedcord/utils/internal';
import { Routes } from 'discord-api-types/v10';

import type { REST, RequestData } from '@discordjs/rest';
import type {
    RESTGetAPIOAuth2CurrentAuthorizationResult,
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

export interface CodeExchange {
    code: string;
    redirectUri: string;
    // only for a flow that sent a code_challenge. discord refuses that exchange without it
    codeVerifier?: string | undefined;
}

// discord answers `invalid_grant` for a code or a refresh token that was used, expired, or made up, and
// for a refresh token whose grant ended. it answers `invalid_request` to a refresh that arrives while
// another refresh of the same token is still running
type TokenAnswer<TGrant> =
    | { kind: 'granted'; grant: TGrant }
    | { kind: 'refused'; invalidGrant: boolean; error: unknown };

type RefreshAnswer = TokenAnswer<RESTPostOAuth2AccessTokenResult>;

// auth: false stops @discordjs/rest from sending the bot token, and from clearing it when the call gets a 401
const AS_ANOTHER_IDENTITY = { auth: false } satisfies RequestData;

export class TokenEndpoint {
    private readonly authorization: string;

    constructor(
        private readonly rest: REST,
        clientId: string,
        clientSecret: string
    ) {
        this.authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    }

    // undefined for a code that discord answers `invalid_grant` to
    public async exchange({ code, redirectUri, codeVerifier }: CodeExchange): Promise<ExchangeResult | undefined> {
        const fields = { grant_type: 'authorization_code', code, redirect_uri: redirectUri };
        const answer = await this.grant<ExchangeResult>(
            codeVerifier === undefined ? fields : { ...fields, code_verifier: codeVerifier }
        );
        if (answer.kind === 'granted') return answer.grant;
        if (answer.invalidGrant) return undefined;
        throw answer.error;
    }

    public async refresh(refreshToken: string): Promise<RefreshAnswer> {
        return this.grant({ grant_type: 'refresh_token', refresh_token: refreshToken });
    }

    // this ends every grant that the user gave the app, whichever token you pass
    public async revoke(token: string): Promise<void> {
        await this.post(Routes.oauth2TokenRevocation(), { token });
    }

    public async authorizationOf(accessToken: string): Promise<RESTGetAPIOAuth2CurrentAuthorizationResult> {
        // justified: discord documents this body for the route
        return (await this.rest.get(
            Routes.oauth2CurrentAuthorization(),
            bearer(accessToken)
        )) as RESTGetAPIOAuth2CurrentAuthorizationResult;
    }

    private async grant<TGrant>(fields: Record<string, string>): Promise<TokenAnswer<TGrant>> {
        try {
            // justified: discord documents this body for both grant types
            return { kind: 'granted', grant: (await this.post(Routes.oauth2TokenExchange(), fields)) as TGrant };
        } catch (error) {
            const code = discordErrorOf(error)?.code;
            // an oauth error's code is a word. discord's other errors have a number
            if (typeof code !== 'string') throw error;
            return { kind: 'refused', invalidGrant: code === 'invalid_grant', error };
        }
    }

    // discord takes the token routes as a form, sent as the app with the client id and secret
    private async post(route: `/${string}`, fields: Record<string, string>): Promise<unknown> {
        try {
            return await this.rest.post(route, {
                ...AS_ANOTHER_IDENTITY,
                headers: { Authorization: this.authorization, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(fields),
                passThroughBody: true
            });
        } catch (error) {
            if (discordErrorOf(error)?.code !== 'invalid_client') throw error;
            throw new SeedcordError(SeedcordErrorCode.PluginOAuthSecretRefused, { cause: error });
        }
    }
}

export function bearer(accessToken: string, headers?: Record<string, string>): Pick<RequestData, 'auth' | 'headers'> {
    return { ...AS_ANOTHER_IDENTITY, headers: { ...headers, Authorization: `Bearer ${accessToken}` } };
}
