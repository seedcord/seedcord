import type { KeysOfUnion, ValueOf } from 'type-fest';

/**
 * Keeps only those union members where PropertyKey exists and matches PropertyValue.
 * @typeParam UnionType - The union type to filter
 * @typeParam PropKey - The property key to check
 * @typeParam PropertyValue - The property value to match
 *
 * @example
 * ```ts
 * type Shape =
 *   | { type: 'circle'; radius: number }
 *   | { type: 'square'; sideLength: number }
 *   | { type: 'rectangle'; width: number; height: number };
 *
 * type Circles = FilterUnionByProperty<Shape, 'type', 'circle'>;
 * // Result: { type: 'circle'; radius: number }
 * ```
 */
export type FilterUnionByProperty<
    UnionType,
    PropKey extends KeysOfUnion<UnionType>,
    PropertyValue extends ValueOf<UnionType>
> = UnionType extends Record<PropKey, PropertyValue> ? UnionType : never;
