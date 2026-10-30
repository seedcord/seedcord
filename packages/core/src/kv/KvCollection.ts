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
 * The records of one type, stored under one name in `config.kv`. Get one from
 * `kv.collection<T>('name')`.
 *
 * Every record goes through JSON on its way in and out. A `Date` you store reads back from `get()`
 * as an ISO string.
 *
 * @example
 * ```ts
 * interface Profile { bio: string; joinedAt: Date }
 * const profiles = this.core.kv.collection<Profile>('profile');
 *
 * await profiles.set(user.id, { bio: 'hi', joinedAt: new Date() });
 * const profile = await profiles.get(user.id); // { bio: string; joinedAt: string } | undefined
 * await profiles.delete(user.id);
 * ```
 */
export class KvCollection<TRecord> {
    readonly #driver: KvDriver;
    readonly #prefix: string;

    constructor(driver: KvDriver, prefix: string) {
        this.#driver = driver;
        this.#prefix = prefix;
    }

    /** Reads the record stored under `id`. Resolves to `undefined` when nothing is there or the record expired. */
    public async get(id: string): Promise<Jsonify<TRecord> | undefined> {
        const raw = await this.#driver.get(this.#prefix + id);
        return raw === undefined ? undefined : this.#liveValue(raw);
    }

    /**
     * Stores `value` under `id` and replaces whatever was there.
     *
     * @param ttlMs - How long the record lasts, in milliseconds. Leave it out to keep the record until you delete it.
     */
    public async set(id: string, value: TRecord, ttlMs?: number): Promise<void> {
        const envelope: Envelope<TRecord> = ttlMs === undefined ? { value } : { value, expiresAt: Date.now() + ttlMs };
        await this.#driver.set(this.#prefix + id, JSON.stringify(envelope), ttlMs);
    }

    /** Removes the record under `id`. */
    public async delete(id: string): Promise<void> {
        await this.#driver.delete(this.#prefix + id);
    }

    /**
     * Changes the record under `id` based on what it holds now. `next` gets the current record, or
     * `undefined` when there is none. It returns an object with:
     *
     * - `value`: the record to store
     * - `result`: what `update()` resolves to, which can differ from `value`
     * - `ttlMs` (optional): how long the stored record lasts
     *
     * Use it over a `get()` then a `set()` when two calls can change one record at the same time.
     * Calls on one id in this process run one after the other. None of them loses another's change.
     * Two processes sharing one backend can still both read before either writes.
     *
     * @example
     * ```ts
     * // counts a run of the command and resolves to the new count
     * const runs = await counts.update(user.id, (count) => {
     *     const total = (count ?? 0) + 1;
     *     return { value: total, result: total };
     * });
     * ```
     */
    public async update<TResult>(
        id: string,
        next: (current: Jsonify<TRecord> | undefined) => { value: TRecord; result: TResult; ttlMs?: number }
    ): Promise<TResult> {
        const key = this.#prefix + id;
        const queue = updateQueue(this.#driver);
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

    /**
     * Yields `[id, record]` for every record in this collection that hasn't expired. Use it to read
     * back what the bot saved before a restart.
     *
     * @throws A **SeedcordError** when the backend can't list its keys, like `@keyv/memcache`.
     * @example
     * ```ts
     * // schedules every saved reminder again after a restart
     * for await (const [id, reminder] of reminders.entries()) schedule(id, reminder);
     * ```
     */
    public async *entries(): AsyncIterable<[id: string, record: Jsonify<TRecord>]> {
        for await (const [key, raw] of this.#driver.entries(this.#prefix)) {
            const value = this.#liveValue(raw);
            if (value !== undefined) yield [key.slice(this.#prefix.length), value];
        }
    }

    #liveValue(raw: string): Jsonify<TRecord> | undefined {
        // justified: only this collection writes under its prefix
        const envelope = JSON.parse(raw) as Envelope<Jsonify<TRecord>>;
        if (envelope.expiresAt !== undefined && envelope.expiresAt <= Date.now()) return undefined;
        return envelope.value;
    }
}
