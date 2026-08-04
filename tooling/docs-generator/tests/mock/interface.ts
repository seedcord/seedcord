/**
 * A complex mock interface for testing documentation generation.
 *
 * This interface demonstrates various interface features including nested interfaces,
 * recursive types, and different property types.
 *
 * @typeParam TypeT - The generic type parameter.
 * @example
 * ```typescript
 * const obj: MockInterface<string> = {
 *   prop: 'value',
 *   method: () => 'result'
 * };
 * ```
 * @see {@link MockType} for related type definitions.
 */
export interface MockInterface<TypeT> {
    /**
     * A required property.
     */
    prop: TypeT;

    /**
     * An optional property.
     */
    optionalProp?: string;

    /**
     * A readonly property.
     */
    readonly readonlyProp: number;

    /**
     * A method in the interface.
     *
     * @param input - The input parameter.
     * @returns The result.
     */
    method(input: TypeT): TypeT;

    /**
     * An optional method.
     *
     * @param value - The value.
     */
    optionalMethod?(value: string): void;

    /**
     * A nested interface.
     */
    nested: {
        /**
         * Nested property.
         */
        innerProp: boolean;

        /**
         * Nested method.
         *
         * @param data - The data.
         * @returns The processed data.
         */
        innerMethod(data: TypeT): TypeT[];
    };
}

/**
 * A recursive interface.
 *
 * @example
 * ```typescript
 * const tree: RecursiveInterface = {
 *   value: 1,
 *   children: [
 *     { value: 2, children: [] }
 *   ]
 * };
 * ```
 * @internal
 */
export interface RecursiveInterface {
    /**
     * The value of the node.
     */
    value: number;

    /**
     * The children nodes.
     */
    children: RecursiveInterface[];
}

/**
 * An interface with index signatures.
 *
 * @example
 * ```typescript
 * const obj: IndexableInterface = {
 *   'key1': 'value1',
 *   42: 'value2'
 * };
 * ```
 */
export interface IndexableInterface {
    /**
     * String index signature.
     */
    [key: string]: unknown;

    /**
     * Numeric index signature.
     */
    [key: number]: unknown;
}

/**
 * An interface extending multiple interfaces.
 */
export interface ExtendedInterface extends MockInterface<string>, IndexableInterface {
    /**
     * Additional property from extension.
     */
    extendedProp: boolean;
}
