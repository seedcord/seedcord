/**
 * The backend behind `config.kv`. A driver stores and returns strings, because seedcord turns every
 * value into JSON before it calls the driver.
 */
export interface KvDriver {
    get(key: string): Promise<string | undefined>;
    /** @param ttlMs - Lets the backend delete the key after this many milliseconds. Seedcord checks the expiry on read either way. */
    set(key: string, value: string, ttlMs?: number): Promise<void>;
    delete(key: string): Promise<void>;
    /** Every key that starts with `prefix`, prefix included. */
    keys(prefix: string): Promise<string[]>;
}
