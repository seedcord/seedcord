import type { KvDriver } from '@seedcord/types';

const SWEEP_GAP_MS = 60_000;

interface Entry {
    value: string;
    expiresAt: number | undefined;
}

/**
 * The default `config.kv`. It keeps every key in a `Map` and loses them on restart. On serverless,
 * each running copy keeps its own.
 */
export class MemoryDriver implements KvDriver {
    readonly #entries = new Map<string, Entry>();
    #lastSweep = Date.now();

    public get(key: string): Promise<string | undefined> {
        this.#maybeSweep();
        return Promise.resolve(this.#live(key)?.value);
    }

    public set(key: string, value: string, ttlMs?: number): Promise<void> {
        this.#maybeSweep();
        this.#entries.set(key, { value, expiresAt: ttlMs === undefined ? undefined : Date.now() + ttlMs });
        return Promise.resolve();
    }

    public delete(key: string): Promise<void> {
        this.#entries.delete(key);
        return Promise.resolve();
    }

    public keys(prefix: string): Promise<string[]> {
        this.#maybeSweep();
        return Promise.resolve([...this.#entries.keys()].filter((key) => key.startsWith(prefix) && this.#live(key)));
    }

    #live(key: string): Entry | undefined {
        const entry = this.#entries.get(key);
        if (entry?.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
            this.#entries.delete(key);
            return undefined;
        }
        return entry;
    }

    // runs on access because a timer in global scope throws on workers
    #maybeSweep(): void {
        const now = Date.now();
        if (now - this.#lastSweep < SWEEP_GAP_MS) return;
        this.#lastSweep = now;
        for (const key of this.#entries.keys()) this.#live(key);
    }
}
