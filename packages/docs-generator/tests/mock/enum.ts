/**
 * Represents a complex mock enum for testing documentation generation.
 *
 * This enum demonstrates various enum features including string and numeric values,
 * and mixed types.
 *
 * @example
 * ```typescript
 * const value = MockEnum.First;
 * console.log(value); // 0
 * ```
 * @see {@link MockClass} for related functionality.
 */
export enum MockEnum {
    /**
     * The first enum member with default value.
     */
    First,

    /**
     * The second enum member with explicit value.
     */
    Second = 10,

    /**
     * A string enum member.
     */
    Third = 'third',

    /**
     * Another string enum member.
     */
    Fourth = 'fourth',

    /**
     * A computed enum member.
     */
    Fifth = 20
}
