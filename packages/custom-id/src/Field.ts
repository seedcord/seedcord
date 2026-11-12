import type { Simplify } from 'type-fest';

/**
 * One field in a customId shape, its wire kind plus the type it decodes to.
 *
 * The chain methods build these for you. Write one by hand when you need a shape in a type, like
 * `CustomId<'page', { index: CustomIdField<number> }>`.
 */
export interface CustomIdField<Decoded> {
    /** Which wire encoding this field uses. */
    readonly kind: 'snowflake' | 'uuid' | 'int' | 'bool' | 'oneOf' | 'someOf' | 'string';
    /** Lower bound, for a bounded int field. */
    readonly min?: number;
    /** Upper bound, for a bounded int field. */
    readonly max?: number;
    /** The allowed values, for a oneOf or someOf field. */
    readonly choices?: readonly string[];
    /** Whether this field also accepts null. */
    readonly nullable?: boolean;
    /** Only there to carry the decoded type for the compiler. Nothing sets it at runtime. */
    readonly decoded?: Decoded;
}

/**
 * The fields of a customId, keyed by name.
 *
 * Use it as a constraint when your own helper takes a definition and its params together. When the
 * fields don't matter, use {@link AnyCustomId}.
 *
 * @example
 * ```ts
 * function label<Shape extends CustomIdShape>(id: CustomId<string, Shape>, params: DecodedParams<Shape>): string {
 *     return `${id.prefix} ${JSON.stringify(params)}`;
 * }
 * ```
 */
export type CustomIdShape = Record<string, CustomIdField<unknown>>;

// Simplify flattens the stacked Record intersections into one object so the hover is readable
export type WithField<Shape extends CustomIdShape, Name extends string, Decoded> = Simplify<
    Shape & Record<Name, CustomIdField<Decoded>>
>;

/**
 * The values that a shape decodes to, keyed by field name.
 *
 * @example
 * ```ts
 * const Ticket = new CustomId('ticket').snowflake('ownerId').bool('urgent');
 *
 * // { ownerId: string; urgent: boolean }
 * function open(params: DecodedParams<(typeof Ticket)['shape']>) {}
 * ```
 */
export type DecodedParams<Shape extends CustomIdShape> = Simplify<{
    [Name in keyof Shape]: Shape[Name] extends CustomIdField<infer Decoded> ? Decoded : never;
}>;
