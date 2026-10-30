import type { KvDriver } from '@seedcord/types';
import type { Jsonify } from 'type-fest';

// keyed by driver because kv.collection() returns a new collection on every call
const pendingUpdates = new WeakMap<KvDriver, Map<string, Promise<void>>>();

function updateQueue(driver: KvDriver): Map<string, Promise<void>> {
    const existing = pendingUpdates.get(driver);
    if (existing) return existing;
    const queue = new Map<string, Promise<void>>();
    pendingUpdates.set(driver, queue);
    return queue;
}

// get() checks expiresAt because unstorage's fs driver ignores a ttl
interface Envelope<TValue> {
    value: TValue;
    expiresAt?: number;
}

/**
 * One kind of record under its own prefix, typed where you create it with `kv.collection<T>()`.
 * Records go through JSON. A `Date` you store reads back as a string.
 */
export class KvCollection<TRecord> {
    constructor(
        private readonly driver: KvDriver,
        private readonly prefix: string
    ) {}

    public async get(id: string): Promise<Jsonify<TRecord> | undefined> {
        const raw = await this.driver.get(this.prefix + id);
        if (raw === undefined) return undefined;

        // justified: only this collection writes under its prefix
        const envelope = JSON.parse(raw) as Envelope<Jsonify<TRecord>>;
        if (envelope.expiresAt !== undefined && envelope.expiresAt <= Date.now()) return undefined;
        return envelope.value;
    }

    /** @param ttlMs - Reads return `undefined` after this many milliseconds. */
    public async set(id: string, value: TRecord, ttlMs?: number): Promise<void> {
        const envelope: Envelope<TRecord> = ttlMs === undefined ? { value } : { value, expiresAt: Date.now() + ttlMs };
        await this.driver.set(this.prefix + id, JSON.stringify(envelope), ttlMs);
    }

    public async delete(id: string): Promise<void> {
        await this.driver.delete(this.prefix + id);
    }

    /**
     * Passes the record under `id` to `next` and writes back the `value` it returns, with its `ttlMs`
     * when it sets one. Resolves to its `result`. Calls on one key run one at a time in this process.
     * Two processes on one store can both read before either writes.
     */
    public async update<TResult>(
        id: string,
        next: (current: Jsonify<TRecord> | undefined) => { value: TRecord; result: TResult; ttlMs?: number }
    ): Promise<TResult> {
        const key = this.prefix + id;
        const queue = updateQueue(this.driver);
        const run = (queue.get(key) ?? Promise.resolve()).then(async () => {
            const { value, result, ttlMs } = next(await this.get(id));
            await this.set(id, value, ttlMs);
            return result;
        });

        const settled = run.then(
            () => undefined,
            () => undefined
        );
        queue.set(key, settled);
        void settled.then(() => {
            if (queue.get(key) === settled) queue.delete(key);
        });
        return run;
    }

    /** Costs one driver read per key, because it reads each record to skip the expired ones. */
    public async ids(): Promise<string[]> {
        const keys = await this.driver.keys(this.prefix);
        const ids = keys.map((key) => key.slice(this.prefix.length));
        const live = await Promise.all(ids.map(async (id) => ((await this.get(id)) === undefined ? [] : [id])));
        return live.flat();
    }
}
