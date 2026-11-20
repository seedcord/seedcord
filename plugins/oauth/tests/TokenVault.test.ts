import { describe, expect, it } from 'vite-plus/test';

import { TokenVault } from '#src/TokenVault';

import { TestHost } from './host';

import type { SavedTokens } from '#src/TokenVault';
import type { Kv } from '@seedcord/core';

const APP_ID = '1564002376115949650';
const SECRET = 'client-secret';

const TOKENS: SavedTokens = {
    accessToken: 'access-token-value',
    refreshToken: 'refresh-token-value',
    expiresAt: 1_800_000_000_000,
    scopes: ['identify', 'guilds']
};

function vaultOn(kv: Kv, secret = SECRET): TokenVault {
    return new TokenVault(kv, APP_ID, secret);
}

describe('TokenVault', () => {
    it('reads back the tokens it saved for a user', async () => {
        const vault = vaultOn(new TestHost().kv);

        await vault.save('111', TOKENS);

        expect(await vault.read('111')).toEqual(TOKENS);
        expect(await vault.read('222')).toBeUndefined();
    });

    it('stores the tokens encrypted', async () => {
        const { kv } = new TestHost();

        await vaultOn(kv).save('111', TOKENS);

        const stored = JSON.stringify(await Array.fromAsync(kv.driver.entries('')));
        expect(stored).toContain('111');
        expect(stored).not.toContain(TOKENS.accessToken);
        expect(stored).not.toContain(TOKENS.refreshToken);
    });

    it("doesn't open a record after the client secret changes", async () => {
        const { kv } = new TestHost();
        await vaultOn(kv).save('111', TOKENS);

        expect(await vaultOn(kv, 'rotated-secret').read('111')).toBeUndefined();
    });

    it("doesn't open a record copied under another user's id", async () => {
        const { kv } = new TestHost();
        const vault = vaultOn(kv);
        await vault.save('111', TOKENS);

        const records = kv.collection<string>('oauth-tokens');
        const sealed = await records.get('111');
        await records.set('222', sealed ?? '');

        expect(sealed).toBeTypeOf('string');
        expect(await vault.read('222')).toBeUndefined();
    });

    it("deletes a user's tokens", async () => {
        const vault = vaultOn(new TestHost().kv);
        await vault.save('111', TOKENS);

        await vault.delete('111');

        expect(await vault.read('111')).toBeUndefined();
    });
});
