import type { KvDriver } from '@seedcord/types';

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
        await this.storage.setItem(key, value, ttlMs === undefined ? {} : { ttl: Math.ceil(ttlMs / 1000) });
    }

    public async delete(key: string): Promise<void> {
        await this.storage.removeItem(key);
    }

    public async keys(prefix: string): Promise<string[]> {
        return this.storage.getKeys(prefix);
    }
}
