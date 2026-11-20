import { describe, expect, it } from 'vite-plus/test';

import { TokenVault } from '#src/TokenVault';

import type { SavedTokens, TokenStore } from '#src/TokenVault';

const APP_ID = '1564002376115949650';
const SECRET = 'client-secret';

const TOKENS: SavedTokens = {
    accessToken: 'access-token-value',
    refreshToken: 'refresh-token-value',
    expiresAt: 1_800_000_000_000,
    scopes: ['identify', 'guilds']
};

function vaultOn(store: TokenStore, secret = SECRET): TokenVault {
    return new TokenVault(store, APP_ID, secret);
}

describe('TokenVault', () => {
    it('reads back the tokens it saved for a user', async () => {
        const vault = vaultOn(new Map());

        await vault.save('111', TOKENS);

        expect(await vault.read('111')).toEqual(TOKENS);
        expect(await vault.read('222')).toBeUndefined();
    });

    it('stores the tokens encrypted', async () => {
        const store = new Map<string, string>();

        await vaultOn(store).save('111', TOKENS);

        const stored = store.get('111');
        expect(stored).toBeTypeOf('string');
        expect(stored).not.toContain(TOKENS.accessToken);
        expect(atob(stored ?? '')).not.toContain(TOKENS.accessToken);
    });

    it("doesn't open a record after the client secret changes", async () => {
        const store = new Map<string, string>();
        await vaultOn(store).save('111', TOKENS);

        expect(await vaultOn(store, 'rotated-secret').read('111')).toBeUndefined();
    });

    it("doesn't open a record copied under another user's id", async () => {
        const store = new Map<string, string>();
        const vault = vaultOn(store);
        await vault.save('111', TOKENS);

        store.set('222', store.get('111') ?? '');

        expect(await vault.read('222')).toBeUndefined();
    });

    it("deletes a user's tokens", async () => {
        const vault = vaultOn(new Map());
        await vault.save('111', TOKENS);

        await vault.delete('111');

        expect(await vault.read('111')).toBeUndefined();
    });
});
