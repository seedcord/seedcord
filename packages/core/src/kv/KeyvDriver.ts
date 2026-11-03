import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { KvDriver, KvEntry } from '@seedcord/types';

// the slice of Keyv 6 this driver calls
interface KeyvLike {
    readonly store: {
        readonly capabilities?: {
            readonly store: string;
            readonly methods: { readonly iterator: { readonly exists: boolean } };
        };
    };
    get(key: string): Promise<unknown>;
    set(key: string, value: string, ttl?: number): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    iterator(): AsyncGenerator<[string, unknown], void>;
    disconnect(): Promise<void>;
}

/**
 * Wraps a Keyv instance for `config.kv`.
 *
 * @example
 * ```ts
 * new Seedcord({ ...config, kv: new KeyvDriver(new Keyv(new KeyvSqlite('sqlite://./kv.sqlite'))) });
 * ```
 */
export class KeyvDriver<TKeyv extends KeyvLike> implements KvDriver, AsyncDisposable {
    constructor(
        /** The Keyv instance you passed, with its full type. */
        public readonly keyv: TKeyv
    ) {}

    public async get(key: string): Promise<string | undefined> {
        const value = await this.keyv.get(key);
        return typeof value === 'string' ? value : undefined;
    }

    public async set(key: string, value: string, ttlMs?: number): Promise<void> {
        if (!(await this.keyv.set(key, value, ttlMs)))
            throw new SeedcordError(SeedcordErrorCode.CoreKvDriverFailed, ['write', key]);
    }

    public async delete(key: string): Promise<void> {
        await this.keyv.delete(key);
    }

    /** @throws A **SeedcordError** when the Keyv store can't list its keys, like `@keyv/memcache`. */
    public async *entries(prefix: string): AsyncIterable<KvEntry> {
        if (!this.#canListKeys()) throw new SeedcordError(SeedcordErrorCode.CoreKvKeysUnsupported);

        for await (const [key, value] of this.keyv.iterator()) {
            if (key.startsWith(prefix) && typeof value === 'string') yield [key, value];
        }
    }

    public async [Symbol.asyncDispose](): Promise<void> {
        await this.keyv.disconnect();
    }

    // Keyv iterates a Map-like store itself. any other store without an iterator() doesn't yield anything
    #canListKeys(): boolean {
        const capabilities = this.keyv.store.capabilities;
        return capabilities?.store === 'mapLike' || capabilities?.methods.iterator.exists === true;
    }
}
