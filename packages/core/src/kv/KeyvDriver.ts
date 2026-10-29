import type { KvDriver } from '@seedcord/types';

// the slice of Keyv 6 this driver calls
interface KeyvLike {
    get(key: string): Promise<unknown>;
    set(key: string, value: string, ttl?: number): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    iterator(): AsyncGenerator<[string, unknown], void>;
}

/**
 * Wraps a Keyv instance for `config.kv`.
 *
 * @example
 * ```ts
 * new Seedcord({ ...config, kv: new KeyvDriver(new Keyv(new KeyvSqlite('sqlite://./kv.sqlite'))) });
 * ```
 */
export class KeyvDriver<TKeyv extends KeyvLike> implements KvDriver {
    constructor(
        /** The Keyv instance you passed, with its full type. */
        public readonly keyv: TKeyv
    ) {}

    public async get(key: string): Promise<string | undefined> {
        const value = await this.keyv.get(key);
        return typeof value === 'string' ? value : undefined;
    }

    public async set(key: string, value: string, ttlMs?: number): Promise<void> {
        await this.keyv.set(key, value, ttlMs);
    }

    public async delete(key: string): Promise<void> {
        await this.keyv.delete(key);
    }

    public async keys(prefix: string): Promise<string[]> {
        const found: string[] = [];
        for await (const [key] of this.keyv.iterator()) if (key.startsWith(prefix)) found.push(key);
        return found;
    }
}
