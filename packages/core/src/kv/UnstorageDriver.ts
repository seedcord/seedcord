import type { KvDriver, KvEntry } from '@seedcord/types';

// cloudflare KV rejects an expirationTtl under 60s. KvCollection checks the real expiry on read
const MIN_TTL_SECONDS = 60;
const MS_PER_SECOND = 1000;

// the fs driver reads a Buffer back
type Bytes = NonNullable<Parameters<TextDecoder['decode']>[0]>;

// the slice of unstorage 1.x and 2.x this driver calls
interface StorageLike {
    getItemRaw(key: string): Promise<string | Bytes | null>;
    setItemRaw(key: string, value: string, opts?: { ttl?: number }): Promise<void>;
    removeItem(key: string): Promise<void>;
    getKeys(): Promise<string[]>;
    dispose(): Promise<void>;
}

// unstorage rewrites `/`, `?` and empty segments. it hides a key ending in `$`.
// its fs driver throws on `..` and can't store `a` beside `a:b`. escaping the whole key into one segment avoids each of these
function storageKey(key: string): string {
    return `_${encodeURIComponent(key).replaceAll('.', '%2E')}`;
}

function originalKey(stored: string): string {
    return decodeURIComponent(stored.slice(1));
}

function text(raw: string | Bytes | null): string | undefined {
    if (raw === null) return undefined;
    return typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
}

/**
 * Wraps an unstorage `Storage` for `config.kv`.
 *
 * @example
 * ```ts
 * new Seedcord({ ...config, kv: new UnstorageDriver(createStorage({ driver: fsDriver({ base: './.kv' }) })) });
 * ```
 */
export class UnstorageDriver<TStorage extends StorageLike> implements KvDriver, AsyncDisposable {
    constructor(
        /** The storage you passed, with its full type. */
        public readonly storage: TStorage
    ) {}

    public async get(key: string): Promise<string | undefined> {
        return text(await this.storage.getItemRaw(storageKey(key)));
    }

    public async set(key: string, value: string, ttlMs?: number): Promise<void> {
        // unstorage takes seconds
        const ttl = ttlMs === undefined ? {} : { ttl: Math.max(MIN_TTL_SECONDS, Math.ceil(ttlMs / MS_PER_SECOND)) };
        await this.storage.setItemRaw(storageKey(key), value, ttl);
    }

    public async delete(key: string): Promise<void> {
        await this.storage.removeItem(storageKey(key));
    }

    public async *entries(prefix: string): AsyncIterable<KvEntry> {
        // storageKey escapes one character at a time.
        // a stored key starts with the stored prefix exactly when the original does
        const storedPrefix = storageKey(prefix);
        for (const key of await this.storage.getKeys()) {
            if (!key.startsWith(storedPrefix)) continue;
            const value = text(await this.storage.getItemRaw(key));
            if (value !== undefined) yield [originalKey(key), value];
        }
    }

    public async [Symbol.asyncDispose](): Promise<void> {
        await this.storage.dispose();
    }
}
