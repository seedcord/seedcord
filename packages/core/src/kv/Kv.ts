import { GuardedDriver } from './GuardedDriver';
import { KeyedQueue } from './KeyedQueue';
import { KvCollection } from './KvCollection';

import type { Config } from '@seedcord/types';

type ConfiguredDriver = NonNullable<Config['kv']>;

// what JSON.stringify keeps as written. a Date passes through its toJSON
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

// tsc prints a failed string argument against an object type as only `string is not assignable`
type CollectionName<TRecord> = unknown extends TRecord
    ? 'Pass the record type, like kv.collection<Profile>(name).'
    : [TRecord] extends [JsonSafe<TRecord>]
      ? string
      : 'This record type holds a value JSON cannot keep, like a function, Map, Set, or bigint.';

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
