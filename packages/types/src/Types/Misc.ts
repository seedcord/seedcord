/**
 * Makes a type nullable by adding null and undefined
 * @typeParam Value - The type to make nullable
 *
 * @example
 * ```ts
 * type NullableString = Nullable<string>; // Result: string | null | undefined
 * type NullableNull = Nullable<null>; // Result: null | undefined
 * ```
 */
export type Nullable<Value = null> = Value extends null ? null | undefined : Value | null | undefined;
