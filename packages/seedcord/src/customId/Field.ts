// the field types a customId carries. the chain methods on CustomId build these at runtime.

/** One field in a customId shape, its wire kind plus the type it decodes to. */
export interface CustomIdField<Decoded> {
    /** Which wire encoding this field uses. */
    readonly kind: 'snowflake' | 'uuid' | 'int' | 'bool' | 'oneOf' | 'string';
    /** Lower bound, for a bounded int field. */
    readonly min?: number;
    /** Upper bound, for a bounded int field. */
    readonly max?: number;
    /** The allowed values, for a oneOf field. */
    readonly choices?: readonly string[];
    /** Phantom only, carries the decoded type and is never set at runtime. */
    readonly decoded?: Decoded;
}

/** The set of fields a customId carries, keyed by name. */
export type CustomIdShape = Record<string, CustomIdField<unknown>>;

/** The decoded result, each field name mapped to its decoded type. */
export type DecodedParams<Shape extends CustomIdShape> = {
    [Name in keyof Shape]: Shape[Name] extends CustomIdField<infer Decoded> ? Decoded : never;
};
