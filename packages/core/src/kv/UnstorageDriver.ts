import type { KvDriver } from '@seedcord/types';

// cloudflare KV rejects an expirationTtl under 60s. KvCollection checks the real expiry on read
const MIN_TTL_SECONDS = 60;
const MS_PER_SECOND = 1000;

// the slice of unstorage 1.x and 2.x this driver calls
interface StorageLike {
    getItem(key: string): Promise<unknown>;
    setItem(key: string, value: string, opts?: { ttl?: number }): Promise<void>;
    removeItem(key: string): Promise<void>;
    getKeys(base?: string): Promise<string[]>;
}

/**
 * Wraps an unstorage `Storage` for `config.kv`.
 *
 * @example
 * ```ts
 * new Seedcord({ ...config, kv: new UnstorageDriver(createStorage({ driver: fsDriver({ base: './.kv' }) })) });
 * ```
 */
export class UnstorageDriver<TStorage extends StorageLike> implements KvDriver {
    constructor(
        /** The storage you passed, with its full type. */
        public readonly storage: TStorage
    ) {}

    public async get(key: string): Promise<string | undefined> {
        // getItem parses the stored JSON text with destr
        const value = await this.storage.getItem(key);
        return value === null ? undefined : JSON.stringify(value);
    }

    public async set(key: string, value: string, ttlMs?: number): Promise<void> {
        // unstorage takes seconds
        const ttl = ttlMs === undefined ? {} : { ttl: Math.max(MIN_TTL_SECONDS, Math.ceil(ttlMs / MS_PER_SECOND)) };
        await this.storage.setItem(key, value, ttl);
    }

    public async delete(key: string): Promise<void> {
        await this.storage.removeItem(key);
    }

    public async keys(prefix: string): Promise<string[]> {
        return this.storage.getKeys(prefix);
    }
}
