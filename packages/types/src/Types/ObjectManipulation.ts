import type { KeysOfUnion } from 'type-fest';

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
