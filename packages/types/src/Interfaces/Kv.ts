/**
 * The backend behind `config.kv`. A driver stores and returns strings, because seedcord turns every
 * value into JSON before it calls the driver. A node bot disposes it after the last shutdown phase.
 */
export interface KvDriver extends AsyncDisposable {
    get(key: string): Promise<string | undefined>;
    /** @param ttlMs - Lets the backend delete the key after this many milliseconds. Seedcord checks the expiry on read either way. */
    set(key: string, value: string, ttlMs?: number): Promise<void>;
    delete(key: string): Promise<void>;
    /** Every key that starts with `prefix`, prefix included, with its value. Throw if the backend can't list its keys. */
    entries(prefix: string): AsyncIterable<[key: string, value: string]>;
}
