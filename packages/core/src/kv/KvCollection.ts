import type { KeyedQueue } from './KeyedQueue';
import type { KvDriver } from '@seedcord/types';
import type { Jsonify } from 'type-fest';

// expiresAt covers backends that ignore a ttl, like unstorage's fs driver
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
    readonly #updates: KeyedQueue;

    constructor(driver: KvDriver, prefix: string, updates: KeyedQueue) {
        this.#driver = driver;
        this.#prefix = prefix;
        this.#updates = updates;
    }

    /** Reads the record stored under `id`. Resolves to `undefined` when nothing is there or the record expired. */
    public async get(id: string): Promise<Jsonify<TRecord> | undefined> {
        const key = this.#prefix + id;
        const raw = await this.#driver.get(key);
        const value = this.#liveValue(raw);
        if (raw !== undefined && value === undefined) await this.#deleteExpired(key);
        return value;
    }

    /**
     * Stores `value` under `id` and replaces whatever was there.
     *
     * @param ttlMs - How long the record lasts, in milliseconds. Leave it out to keep the record until you delete it.
     */
    public async set(id: string, value: TRecord, ttlMs?: number): Promise<void> {
        const key = this.#prefix + id;
        await this.#updates.run(key, async () => this.#write(key, value, ttlMs));
    }

    /** Removes the record under `id`. */
    public async delete(id: string): Promise<void> {
        const key = this.#prefix + id;
        await this.#updates.run(key, async () => this.#driver.delete(key));
    }

    /**
     * Stores what `next` returns for the record under `id`, then resolves to that value. `next` gets
     * the current record, or `undefined` when there is none.
     *
     * Use it over a `get()` then a `set()` when two calls can change one record at the same time.
     * `set()`, `delete()`, and `update()` calls on one id run one after the other in this process.
     * None of them loses another's change. Two processes sharing one backend can still both read
     * before either writes.
     *
     * @param ttlMs - How many milliseconds the stored record lasts. Pass a function to work it out from the record. Leave it out to keep the record until you delete it.
     * @example
     * ```ts
     * // counts a run of the command and resolves to the new count
     * const runs = await counts.update(user.id, (count) => (count ?? 0) + 1);
     * ```
     */
    public async update(
        id: string,
        next: (current: Jsonify<TRecord> | undefined) => TRecord,
        ttlMs?: number | ((value: TRecord) => number)
    ): Promise<TRecord> {
        const key = this.#prefix + id;
        return this.#updates.run(key, async () => {
            const value = next(this.#liveValue(await this.#driver.get(key)));
            await this.#write(key, value, typeof ttlMs === 'function' ? ttlMs(value) : ttlMs);
            return value;
        });
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
        const expired: string[] = [];
        try {
            for await (const [key, raw] of this.#driver.entries(this.#prefix)) {
                const value = this.#liveValue(raw);
                if (value === undefined) expired.push(key);
                else yield [key.slice(this.#prefix.length), value];
            }
        } finally {
            // deletes wait until the listing ends. a driver may be reading from an open cursor
            await Promise.all(expired.map(async (key) => this.#deleteExpired(key)));
        }
    }

    async #write(key: string, value: TRecord, ttlMs: number | undefined): Promise<void> {
        const envelope: Envelope<TRecord> = ttlMs === undefined ? { value } : { value, expiresAt: Date.now() + ttlMs };
        await this.#driver.set(key, JSON.stringify(envelope), ttlMs);
    }

    // reads again in the queue. a set queued after the first read may have stored a live record
    async #deleteExpired(key: string): Promise<void> {
        await this.#updates.run(key, async () => {
            const raw = await this.#driver.get(key);
            if (raw !== undefined && this.#liveValue(raw) === undefined) await this.#driver.delete(key);
        });
    }

    #liveValue(raw: string | undefined): Jsonify<TRecord> | undefined {
        if (raw === undefined) return undefined;
        // justified: only this collection writes under its prefix
        const envelope = JSON.parse(raw) as Envelope<Jsonify<TRecord>>;
        if (envelope.expiresAt !== undefined && envelope.expiresAt <= Date.now()) return undefined;
        return envelope.value;
    }
}
