import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { delay } from 'es-toolkit';

import { TokenEndpoint } from './TokenEndpoint';
import { TokenVault } from './TokenVault';

import type { OAuthLogin } from './LoginOutcome';
import type { CodeExchange } from './TokenEndpoint';
import type { SavedTokens, TokenStore } from './TokenVault';
import type { OAuthScope } from './UserCalls';
import type { REST } from '@discordjs/rest';
import type { EpochMs } from '@seedcord/types';
import type { RESTPostOAuth2AccessTokenResult } from 'discord-api-types/v10';

// discord's access tokens last 7 days. we refresh 5 minutes early so one doesn't expire in the middle
// of a request
const REFRESH_EARLY_MS = 5 * 60 * 1000;

// how long the loser of a refresh race gives the winner to save its tokens. 250ms is a guess
const RACE_WAIT_MS = 250;

interface UserTokensOptions {
    rest: REST;
    store: TokenStore;
    clientId: string;
    clientSecret: string;
}

// nothing in here deletes a user's tokens because discord refused them. a refresh token works once, and
// when two processes refresh the same one, discord refuses the second. that refusal looks like the one
// for a user who removed the app. the only difference is in the store, where the winner saves newer
// tokens, and a store can take a while to show a write. a delete could remove the winner's tokens.
// forget() and revoke() delete, and a new login writes over the old record.
//
// two calls in one process race the same way and take the same path. they don't share one refresh
// promise because on workers a request can't wait on I/O that another request started.
export class UserTokens {
    private readonly endpoint: TokenEndpoint;
    private readonly vault: TokenVault;

    constructor({ rest, store, clientId, clientSecret }: UserTokensOptions) {
        this.endpoint = new TokenEndpoint(rest, clientId, clientSecret);
        this.vault = new TokenVault(store, clientId, clientSecret);
    }

    public async claim(exchange: CodeExchange): Promise<OAuthLogin | undefined> {
        const granted = await this.endpoint.exchange(exchange);
        if (!granted) return undefined;

        const { user } = await this.endpoint.authorizationOf(granted.access_token);
        if (!user) throw new SeedcordError(SeedcordErrorCode.PluginOAuthIdentifyMissing);

        const { scopes } = await this.save(user.id, granted);
        return { user, scopes, guild: granted.guild, webhook: granted.webhook };
    }

    public async saved(userId: string): Promise<SavedTokens | undefined> {
        return this.vault.read(userId);
    }

    public async fresh(userId: string): Promise<SavedTokens> {
        const saved = await this.vault.read(userId);
        if (!saved) throw new SeedcordError(SeedcordErrorCode.PluginOAuthLoginNeeded, [userId, 'never']);
        if (saved.expiresAt - REFRESH_EARLY_MS > Date.now()) return saved;
        return this.refresh(userId, saved);
    }

    public async newerThan(userId: string, stale: SavedTokens): Promise<SavedTokens | undefined> {
        const latest = await this.vault.read(userId);
        return latest && latest.refreshToken !== stale.refreshToken ? latest : undefined;
    }

    public async forget(userId: string): Promise<void> {
        await this.vault.delete(userId);
    }

    public async revoke(userId: string): Promise<void> {
        const saved = await this.vault.read(userId);
        if (!saved) return;
        await this.endpoint.revoke(saved.refreshToken);
        await this.vault.delete(userId);
    }

    private async refresh(userId: string, saved: SavedTokens): Promise<SavedTokens> {
        const answer = await this.endpoint.refresh(saved.refreshToken);
        if (answer.kind === 'granted') return this.save(userId, answer.grant);

        await delay(RACE_WAIT_MS);
        const newer = await this.newerThan(userId, saved);
        if (newer) return newer;
        if (!answer.invalidGrant) throw answer.error;
        throw new SeedcordError(SeedcordErrorCode.PluginOAuthLoginNeeded, [userId, 'refused'], {
            cause: answer.error
        });
    }

    private async save(userId: string, granted: RESTPostOAuth2AccessTokenResult): Promise<SavedTokens> {
        const tokens: SavedTokens = {
            accessToken: granted.access_token,
            refreshToken: granted.refresh_token,
            // justified: Date.now() is epoch milliseconds, and expires_in is seconds
            expiresAt: (Date.now() + granted.expires_in * 1000) as EpochMs,
            // justified: discord answers with its own scope names
            scopes: granted.scope.split(' ') as OAuthScope[]
        };
        await this.vault.save(userId, tokens);
        return tokens;
    }
}
