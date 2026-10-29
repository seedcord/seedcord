import { KvCollection } from './KvCollection';

import type { KvDriver } from '@seedcord/types';

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
type CollectionName<TRecord> = [TRecord] extends [JsonSafe<TRecord>]
    ? string
    : 'This record type holds a value JSON cannot keep, like a function, Map, Set, or bigint.';

/**
 * The bot's key-value store, or one prefixed slice of it. `core.kv` holds your handlers' records. A
 * plugin's `this.kv` holds the plugin's.
 *
 * @typeParam TDriver - The driver from `config.kv`.
 */
export class Kv<TDriver extends KvDriver = KvDriver> {
    constructor(
        /** What you passed as `config.kv`, for calling the library's own methods. */
        public readonly driver: TDriver,
        private readonly prefix = ''
    ) {}

    /**
     * Records of one type under `name`. A record type holding a function, `Map`, `Set`, or `bigint`
     * fails to compile here.
     */
    public collection<TRecord>(name: CollectionName<TRecord>): KvCollection<TRecord> {
        return new KvCollection<TRecord>(this.driver, `${this.prefix}${name}:`);
    }

    /** @internal */
    public scope(name: string): Kv<TDriver> {
        return new Kv(this.driver, `${this.prefix}${name}:`);
    }
}
