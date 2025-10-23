import type { Simplify } from 'type-fest';

/**
 * Makes all properties of an object type optional except for the specified required keys.
 * @typeParam ObjectType - The object type to modify
 * @typeParam RequiredPropertyKeys - The keys of the object type to keep required
 *
 * @example
 * ```ts
 * type Example = { a: string; b: number; c: boolean; }
 *
 * type Result = PartialExcept<Example, 'a' | 'b'>;
 * // Result: { a: string; b: number; c?: boolean; }
 * ```
 */
export type PartialExcept<ObjectType, RequiredPropertyKeys extends keyof ObjectType> = Simplify<
    Pick<ObjectType, RequiredPropertyKeys> & Partial<Omit<ObjectType, RequiredPropertyKeys>>
>;

/**
 * Makes all properties required except for the specified optional keys.
 * @typeParam ObjectType - The object type to modify
 * @typeParam PropertyKeys - The keys of the object type to make optional
 *
 * @example
 * ```ts
 * type Example = { a?: string; b: number; c?: boolean; }
 *
 * type Result = RequiredExcept<Example, 'a'>;
 * // Result: { a?: string; b: number; c: boolean; }
 * ```
 */
export type RequiredExcept<ObjectType, PropertyKeys extends keyof ObjectType> = Simplify<
    Required<Omit<ObjectType, PropertyKeys>> & Pick<ObjectType, PropertyKeys>
>;

/**
 * Makes all properties readonly except for the specified mutable keys.
 * @typeParam ObjectType - The object type to modify
 * @typeParam PropertyKeys - The keys of the object type to make mutable
 *
 * @example
 * ```ts
 * type Example = { a: string; b: number; c: boolean; }
 *
 * type Result = ReadonlyExcept<Example, 'b' | 'c'>;
 * // Result: { readonly a: string; b: number; c: boolean; }
 * ```
 */
export type ReadonlyExcept<ObjectType, PropertyKeys extends keyof ObjectType> = Simplify<
    Pick<ObjectType, PropertyKeys> & Readonly<Omit<ObjectType, PropertyKeys>>
>;

/**
 * Ensures that optional properties in an object type explicitly include `undefined` in their type.
 * @typeParam ObjectType - The object type to modify
 *
 * @example
 * ```ts
 * type Example = {
 *   requiredKey: string;
 *   optionalKey?: number;
 * }
 *
 * type Result = EnsureUndefinedForOptionalProps<Example>;
 * // Result: {
 * //   requiredKey: string;
 * //   optionalKey: number | undefined;
 * // }
 * ```
 */
export type EnsureUndefinedForOptionalProps<ObjectType> = Simplify<{
    [Property in keyof ObjectType]: {} extends Pick<ObjectType, Property>
        ? ObjectType[Property] | undefined
        : ObjectType[Property];
}>;
