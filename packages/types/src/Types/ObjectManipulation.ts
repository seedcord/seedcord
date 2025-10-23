import type { KeysOfUnion } from 'type-fest';

/**
 * Builds a record type whose properties are all readonly and have the specified value type.
 * @typeParam KeyType - Keys for the resulting record.
 * @typeParam ValueType - Value for every key in the record.
 *
 * @example
 * ```ts
 * type ReadonlyStringNumberRecord = ReadonlyRecord<string, number>;
 * // Result: { readonly [key: string]: number }
 * ```
 */
export type ReadonlyRecord<KeyType extends PropertyKey, ValueType> = Readonly<Record<KeyType, ValueType>>;

/**
 * Builds a record type whose properties are all optional and have the specified value type.
 * @typeParam KeyType - Keys for the resulting record.
 * @typeParam ValueType - Value for every key in the record.
 *
 * @example
 * ```ts
 * type PartialStringNumberRecord = PartialRecord<string, number>;
 * // Result: { [key: string]?: number }
 * ```
 */
export type PartialRecord<KeyType extends PropertyKey, ValueType> = Partial<Record<KeyType, ValueType>>;

/**
 * Renames a key in an object type
 * @typeParam BaseObj - The object type containing the key to rename
 * @typeParam FromKey - The key to rename
 * @typeParam ToKey - The new name for the key
 *
 * @example
 * ```ts
 * type Original = { oldKey: string; anotherKey: number };
 * type Renamed = RenameKey<Original, 'oldKey', 'newKey'>;
 * // Result: { newKey: string; anotherKey: number }
 * ```
 */
export type RenameKey<BaseObj, FromKey extends KeysOfUnion<BaseObj>, ToKey extends PropertyKey> = {
    [K in keyof BaseObj as K extends FromKey ? ToKey : K]: BaseObj[K];
};
