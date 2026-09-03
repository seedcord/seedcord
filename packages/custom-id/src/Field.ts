// the field types a customId carries. the chain methods on CustomId build these at runtime.

/**
 * One field in a customId shape, its wire kind plus the type it decodes to.
 *
 * The chain methods build these for you. Write one by hand to name a shape in a type position, as
 * `CustomId<'page', { index: CustomIdField<number> }>`.
 */
export interface CustomIdField<Decoded> {
    /** Which wire encoding this field uses. */
    readonly kind: 'snowflake' | 'uuid' | 'int' | 'bool' | 'oneOf' | 'string';
    /** Lower bound, for a bounded int field. */
    readonly min?: number;
    /** Upper bound, for a bounded int field. */
    readonly max?: number;
    /** The allowed values, for a oneOf field. */
    readonly choices?: readonly string[];
    /** Whether this field also carries null. */
    readonly nullable?: boolean;
    /** Phantom only, carries the decoded type and is never set at runtime. */
    readonly decoded?: Decoded;
}

/**
 * The set of fields a customId carries, keyed by name.
 *
 * Write it as a constraint when a helper of your own takes a definition and its params together.
 * {@link AnyCustomId} covers the looser case where the fields do not matter.
 *
 * @example
 * ```ts
 * function label<Shape extends CustomIdShape>(id: CustomId<string, Shape>, params: DecodedParams<Shape>): string {
 *     return `${id.prefix} ${JSON.stringify(params)}`;
 * }
 * ```
 */
export type CustomIdShape = Record<string, CustomIdField<unknown>>;

/**
 * The decoded result, each field name mapped to its decoded type.
 *
 * @example
 * ```ts
 * const Ticket = new CustomId('ticket').snowflake('ownerId').bool('urgent');
 *
 * // { ownerId: string; urgent: boolean }
 * function open(params: DecodedParams<(typeof Ticket)['shape']>) {}
 * ```
 */
export type DecodedParams<Shape extends CustomIdShape> = {
    [Name in keyof Shape]: Shape[Name] extends CustomIdField<infer Decoded> ? Decoded : never;
};
