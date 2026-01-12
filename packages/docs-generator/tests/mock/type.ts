/**
 * A complex mock type for testing documentation generation.
 *
 * This type demonstrates various TypeScript type features including unions,
 * intersections, mapped types, and conditional types.
 *
 * @example
 * ```typescript
 * const value: MockType = 'string' as const;
 * ```
 * @see {@link MockInterface} for related interface definitions.
 */

/**
 * A union type.
 */
export type MockUnion = string | number | boolean;

/**
 * An intersection type.
 */
export type MockIntersection = { a: string } & { b: number };

/**
 * A literal type.
 */
export type MockLiteral = 'literal1' | 'literal2' | 42; // eslint-disable-line no-magic-numbers

/**
 * A tuple type.
 */
export type MockTuple = [string, number, boolean];

/**
 * A mapped type.
 *
 * @typeParam TypeT - The type to map over.
 */
export type MockMapped<TypeT> = {
    [K in keyof TypeT]: TypeT[K] extends string ? string : number;
};

/**
 * A conditional type.
 *
 * @typeParam TypeT - The type to check.
 */
export type MockConditional<TypeT> = TypeT extends string ? string[] : number[];

/**
 * A recursive type.
 */
export interface MockRecursive {
    value: string;
    next?: MockRecursive;
}

/**
 * A template literal type.
 */
export type MockTemplate = `prefix_${string}_suffix`;

/**
 * An indexed access type.
 */
export type MockIndexed = MockIntersection['a'];

/**
 * A keyof type.
 */
export type MockKeyOf = keyof MockIntersection;

/**
 * A type with constraints.
 *
 * @typeParam TypeT - The constrained type.
 */
export type MockConstrained<TypeT extends { prop: string }> = TypeT['prop'];

/**
 * A complex object type.
 */
export interface MockObject {
    /**
     * A property in the object type.
     */
    prop: string;

    /**
     * An optional property.
     */
    optional?: number;

    /**
     * A method in the object type.
     */
    method: (input: string) => string;
}

/**
 * A type alias for a function.
 */
export type MockFunctionType = (param: string) => number;

/**
 * A type with readonly modifier.
 */
export type MockReadonly = Readonly<{ a: string; b: number }>;

/**
 * A type using utility types.
 */
export type MockPartial = Partial<MockObject>;
