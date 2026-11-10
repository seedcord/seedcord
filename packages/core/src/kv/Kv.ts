import { GuardedDriver } from './GuardedDriver';
import { KeyedQueue } from './KeyedQueue';
import { KvCollection } from './KvCollection';

import type { Config } from '@seedcord/types';

type ConfiguredDriver = NonNullable<Config['kv']>;

// TValue as JSON.stringify writes it, with never in place of a function, Map, Set, or bigint.
// a Date passes, since its toJSON() returns a string
type JsonSafe<TValue> = TValue extends string | number | boolean | null | undefined
    ? TValue
    : TValue extends { toJSON(): unknown }
      ? TValue
      : TValue extends (...args: never[]) => unknown
        ? never
        : TValue extends ReadonlyMap<unknown, unknown> | ReadonlySet<unknown>
          ? never
          : TValue extends readonly (infer Item)[]
            ? readonly JsonSafe<Item>[]
            : TValue extends object
              ? { [K in keyof TValue]: JsonSafe<TValue[K]> }
              : never;

type KeepsJson<TValue> = [TValue] extends [JsonSafe<TValue>] ? true : false;

type NotKept<TWhat extends string> =
    `This ${TWhat} holds a value that JSON cannot keep, like a function, Map, Set, or bigint.`;

/**
 * Resolves to `TValue` when a `KvCollection` can store it as JSON. If `TValue` holds a function, a
 * `Map`, a `Set`, or a `bigint`, it resolves to an error message, and a call that passes that value
 * doesn't compile. A `Date` is fine because its `toJSON()` returns an ISO string.
 *
 * @typeParam TValue - The value to check.
 * @typeParam TWhat - What the message calls the value, like `'task data'`.
 * @example
 * ```ts
 * declare function save<TData>(data: Storable<TData, 'data'>): void;
 *
 * save({ at: new Date() });
 * save({ ids: new Set<string>() }); // fails to compile
 * ```
 */
export type Storable<TValue, TWhat extends string> = KeepsJson<TValue> extends true ? TValue : NotKept<TWhat>;

// tsc prints a failed string argument against an object type as only `string is not assignable`
type CollectionName<TRecord> = unknown extends TRecord
    ? 'Pass the record type, like kv.collection<Profile>(name).'
    : KeepsJson<TRecord> extends true
      ? string
      : NotKept<'record type'>;

// unescaped, every key under `user:settings:` would also start with `user:`
function keyPrefix(path: readonly string[]): string {
    return path.map((segment) => `${encodeURIComponent(segment)}:`).join('');
}

/**
 * The bot's key-value store, or one prefixed slice of it. `core.kv` holds your handlers' records. A
 * plugin's `this.kv` holds the plugin's.
 */
export class Kv {
    /** What you passed as `config.kv`. Register its type in `KvTypes` to call the library's own methods on it. */
    public readonly driver: ConfiguredDriver;
    readonly #guarded: GuardedDriver;
    readonly #path: readonly string[];
    readonly #updates = new KeyedQueue();

    constructor(driver: ConfiguredDriver, ...path: string[]) {
        this.driver = driver;
        this.#guarded = new GuardedDriver(driver);
        this.#path = path;
    }

    /**
     * Records of one type under `name`. Pass the type argument. A record type holding a function,
     * `Map`, `Set`, or `bigint` fails to compile here.
     */
    public collection<TRecord>(name: CollectionName<TRecord>): KvCollection<TRecord> {
        return new KvCollection<TRecord>(this.#guarded, keyPrefix([...this.#path, name]), this.#updates);
    }
}
