import { once } from 'es-toolkit';

import { fromBase64, toBase64 } from './base64';

import type { OAuthScope } from './UserCalls';
import type { Promisable } from 'type-fest';

// discord gives the bot an access token and a refresh token for every user who logs in. anyone who has
// those can act as that user. the store can be a sqlite file or a redis that other things read too, and that's
// why saving them as plain text is a bad idea. this file scrambles them before they get saved.
//
// scrambling needs a secret key, and keeping it in the same database as the tokens wouldn't protect
// from anything really. the bot already has one secret that's never in the database, the discord client secret
// from the env. making the key out of that is good because the bot author doesn't set up anything new, and a
// leaked database alone gets you nothing. just that when you rotate the secret the users would have to log in
// again. that's fine though.
//
// the scrambling is AES-GCM. it hides the tokens, and unscrambling fails if
// anyone changed the record, even by one character. you never get wrong tokens back.
//
// every save makes 12 new random bytes, the iv (initialization vector). without them, the same tokens saved
// twice would give the same record twice, and someone reading the database could tell. the iv isn't secret
// and unscrambling needs it, which is why it's stored right in front of the scrambled tokens. the store ends up
// with one string per user, the base64 of [iv][scrambled tokens]

/**
 * Where an `OAuthClient` keeps each user's tokens. Every value is one encrypted string, saved under the
 * user's id.
 *
 * A seedcord `KvCollection<string>` fits, and so does a `Map<string, string>`.
 *
 * @example
 * ```ts
 * const store: TokenStore = bot.kv.collection<string>('oauth-tokens');
 * ```
 */
export interface TokenStore {
    get(userId: string): Promisable<string | undefined>;
    set(userId: string, sealed: string): Promisable<unknown>;
    delete(userId: string): Promisable<unknown>;
}

export interface SavedTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: number; // epoch ms
    scopes: OAuthScope[];
}

// this is NIST's recommendation of 12 bytes for an AES-GCM iv
const IV_BYTES = 12;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// AES takes a key of an exact size, and the client secret is a password for discord's api. HKDF derives
// that key out of it
async function deriveKey(clientId: string, clientSecret: string): Promise<CryptoKey> {
    const secret = await crypto.subtle.importKey('raw', encoder.encode(clientSecret), 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: encoder.encode(clientId),
            info: encoder.encode('seedcord oauth tokens')
        },
        secret,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export class TokenVault {
    private readonly key: () => Promise<CryptoKey>;

    constructor(
        private readonly records: TokenStore,
        clientId: string,
        clientSecret: string
    ) {
        this.key = once(async () => deriveKey(clientId, clientSecret));
    }

    public async save(userId: string, tokens: SavedTokens): Promise<void> {
        const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
        const sealed = await crypto.subtle.encrypt(
            this.cipher(iv, userId),
            await this.key(),
            encoder.encode(JSON.stringify(tokens))
        );
        // iv first, then the scrambled tokens. read() splits them at IV_BYTES
        const record = new Uint8Array(IV_BYTES + sealed.byteLength);
        record.set(iv);
        record.set(new Uint8Array(sealed), IV_BYTES);
        await this.records.set(userId, toBase64(record));
    }

    public async read(userId: string): Promise<SavedTokens | undefined> {
        const stored = await this.records.get(userId);
        if (stored === undefined) return undefined;

        const bytes = fromBase64(stored);
        const key = await this.key();
        const opened = await crypto.subtle
            .decrypt(this.cipher(bytes.subarray(0, IV_BYTES), userId), key, bytes.subarray(IV_BYTES))
            // fails for a wrong key, a wrong user id, or a changed record. all three mean no usable tokens
            .catch(() => undefined);
        if (!opened) return undefined;

        // justified: only save() writes a record that this key opens
        return JSON.parse(decoder.decode(opened)) as SavedTokens;
    }

    public async delete(userId: string): Promise<void> {
        await this.records.delete(userId);
    }

    private cipher(iv: Uint8Array<ArrayBuffer>, userId: string): Parameters<SubtleCrypto['encrypt']>[0] {
        return { name: 'AES-GCM', iv, additionalData: encoder.encode(userId) };
    }
}
