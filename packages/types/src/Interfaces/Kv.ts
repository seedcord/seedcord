import type { Promisable } from 'type-fest';

/**
 * The backend behind `config.kv`. A driver stores and returns strings, because seedcord turns every
 * value into JSON before it calls the driver. Each method may return its result directly or as a
 * promise.
 *
 * `config.kv` also requires `Disposable` or `AsyncDisposable` on the driver. A node bot calls it
 * after the last shutdown phase to close the backend.
 *
 * @example
 * ```ts
 * class SqliteDriver implements KvDriver, Disposable { ... }
 * class RedisDriver implements KvDriver, AsyncDisposable { ... }
 * ```
 */
export interface KvDriver {
    get(key: string): Promisable<string | undefined>;
    /** @param ttlMs - The backend may delete the key after this many milliseconds. Seedcord checks the expiry on read either way. */
    set(key: string, value: string, ttlMs?: number): Promisable<void>;
    delete(key: string): Promisable<void>;
    /** Every key that starts with `prefix`, prefix included, with its value. Throw if the backend can't list its keys. */
    entries(prefix: string): AsyncIterable<KvEntry> | Iterable<KvEntry>;
}

/** A key and the string stored under it, as {@link KvDriver.entries} yields them. */
export type KvEntry = [key: string, value: string];

/**
 * Register your driver's type here to read it back with its full type from `core.kv.driver`. Once
 * you register one, `config.kv` becomes required and only takes that type. Declare it on the package
 * your bot imports from, `@seedcord/gateway` or `@seedcord/http`.
 *
 * @example
 * ```ts
 * // src/kv.ts
 * export const driver = new KeyvDriver(new Keyv(new KeyvSqlite('sqlite://./kv.sqlite')));
 *
 * declare module '@seedcord/gateway' {
 *     interface KvTypes {
 *         driver: typeof driver;
 *     }
 * }
 * ```
 */
export interface KvTypes {}
