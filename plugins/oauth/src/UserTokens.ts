import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { KeyedQueue } from '@seedcord/utils/internal';
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

// when discord refuses a refresh, another process probably just refreshed the same token. we check the
// store for its tokens up to 20 times, 100ms apart just to make sure
const NEWER_TOKENS_READS = 20;
const NEWER_TOKENS_GAP_MS = 100;

interface UserTokensOptions {
    rest: REST;
    store: TokenStore;
    clientId: string;
    clientSecret: string;
    keepOpen?: ((work: Promise<void>) => void) | undefined;
    // the pause between two reads of the store. tests skip it
    wait?: ((ms: number) => Promise<void>) | undefined;
}

function expiresSoon(tokens: SavedTokens): boolean {
    return tokens.expiresAt - REFRESH_EARLY_MS <= Date.now();
}

// nothing in here deletes a user's tokens because discord refused them. a refresh token works once, and
// when two processes refresh the same one, discord refuses the second. that refusal looks like the one
// for a user who removed the app. the only difference is in the store, where the process that discord
// accepted saves newer tokens, and a store can take a while to show a write. a delete could remove
// those newer tokens. forget() and revoke() delete, and a new login writes over the old record.
//
// every change to one user's record runs through `changes` after the change before it. a forget()
// can't run in the middle of a refresh then, and two calls can't refresh the same token. `changes`
// only orders this process. another process, or another workers isolate, can still do both.
export class UserTokens {
    private readonly endpoint: TokenEndpoint;
    private readonly vault: TokenVault;
    private readonly changes: KeyedQueue;
    private readonly wait: (ms: number) => Promise<void>;
    // the refresh token that discord last refused for each user. a call that reads the same one again
    // throws without asking discord or waiting
    private readonly refused = new Map<string, string>();
    private readonly clientId: string;

    constructor({ rest, store, clientId, clientSecret, keepOpen, wait = delay }: UserTokensOptions) {
        this.clientId = clientId;
        this.endpoint = new TokenEndpoint(rest, clientId, clientSecret);
        this.vault = new TokenVault(store, clientId, clientSecret);
        this.changes = new KeyedQueue(keepOpen);
        this.wait = wait;
    }

    public async claim(exchange: CodeExchange): Promise<OAuthLogin | undefined> {
        const granted = await this.endpoint.exchange(exchange);
        if (!granted) return undefined;

        const { user } = await this.endpoint.authorizationOf(granted.access_token);
        if (!user) throw new SeedcordError(SeedcordErrorCode.PluginOAuthIdentifyMissing);

        const { scopes } = await this.changes.run(user.id, () => this.save(user.id, granted));
        // discord sends every role in the server, and the bot's own has its application id in the tags
        const botRole = granted.guild?.roles.find((role) => role.tags?.bot_id === this.clientId);
        return {
            user,
            scopes,
            guild: granted.guild,
            permissions: botRole && BigInt(botRole.permissions),
            webhook: granted.webhook
        };
    }

    public async saved(userId: string): Promise<SavedTokens | undefined> {
        return this.vault.read(userId);
    }

    public async loggedIn(userId: string): Promise<SavedTokens> {
        const saved = await this.vault.read(userId);
        if (!saved) throw new SeedcordError(SeedcordErrorCode.PluginOAuthLoginNeeded, [userId, 'never']);
        return saved;
    }

    // `saved` itself, or the tokens from a refresh when it's about to expire
    public async unexpired(userId: string, saved: SavedTokens): Promise<SavedTokens> {
        return expiresSoon(saved) ? this.changes.run(userId, () => this.refreshed(userId)) : saved;
    }

    public async newerThan(userId: string, stale: SavedTokens): Promise<SavedTokens | undefined> {
        const latest = await this.vault.read(userId);
        return latest && latest.refreshToken !== stale.refreshToken ? latest : undefined;
    }

    public async forget(userId: string): Promise<void> {
        await this.changes.run(userId, () => this.vault.delete(userId));
    }

    public async revoke(userId: string): Promise<void> {
        await this.changes.run(userId, async () => {
            const saved = await this.vault.read(userId);
            if (!saved) return;
            await this.endpoint.revoke(saved.refreshToken);
            await this.vault.delete(userId);
        });
    }

    // reads the record again because the change that ran before this one may have refreshed or deleted it
    private async refreshed(userId: string): Promise<SavedTokens> {
        const saved = await this.loggedIn(userId);
        if (!expiresSoon(saved)) return saved;
        if (this.refused.get(userId) === saved.refreshToken) {
            throw new SeedcordError(SeedcordErrorCode.PluginOAuthLoginNeeded, [userId, 'refused']);
        }

        const answer = await this.endpoint.refresh(saved.refreshToken);
        if (answer.kind === 'granted') return this.saveOver(userId, saved, answer.grant);

        const newer = await this.newerWithinTheWait(userId, saved);
        if (newer) return newer;
        this.refused.set(userId, saved.refreshToken);
        throw new SeedcordError(SeedcordErrorCode.PluginOAuthLoginNeeded, [userId, 'refused'], {
            cause: answer.error
        });
    }

    private async newerWithinTheWait(userId: string, stale: SavedTokens): Promise<SavedTokens | undefined> {
        for (let read = 0; read < NEWER_TOKENS_READS; read++) {
            if (read > 0) await this.wait(NEWER_TOKENS_GAP_MS);
            const newer = await this.newerThan(userId, stale);
            if (newer) return newer;
        }
        return undefined;
    }

    // check the record before writing over it. another process could've logged the user out or back in
    // while we waited on discord. kv doesn't have compare-and-swap, which leaves a tiny gap after this read
    private async saveOver(
        userId: string,
        sent: SavedTokens,
        granted: RESTPostOAuth2AccessTokenResult
    ): Promise<SavedTokens> {
        const current = await this.loggedIn(userId);
        return current.refreshToken === sent.refreshToken ? this.save(userId, granted) : current;
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
        // discord already ended the old refresh token. if this write fails, the user has to log in again
        await this.vault.save(userId, tokens);
        this.refused.delete(userId);
        return tokens;
    }
}
