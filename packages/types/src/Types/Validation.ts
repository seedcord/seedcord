import type { KeysOfUnion, Simplify } from 'type-fest';

/**
 * Makes a union “strict”: for each variant, keys from other variants are set to never.
 * Great for discriminated unions so extra keys don’t silently pass.
 * @typeParam UnionType - The union type to make strict
 *
 * @example
 * ```ts
 * type Shape =
 *   | { type: 'circle'; radius: number }
 *   | { type: 'square'; sideLength: number };
 *
 * type StrictShape = StrictUnion<Shape>;
 *
 * const validCircle: StrictShape = { type: 'circle', radius: 10 }; // Valid
 * const invalidCircle: StrictShape = { type: 'circle', radius: 10, sideLength: 5 }; // Error
 * ```
 */
export type StrictUnion<UnionType> = UnionType extends unknown
    ? Simplify<UnionType & Partial<Record<Exclude<KeysOfUnion<UnionType>, keyof UnionType>, never>>>
    : never;
