/**
 * A complex mock function for testing documentation generation.
 *
 * This function demonstrates function overloading, generics, and various parameter types.
 *
 * @typeParam TypeT - The generic type for the function.
 * @param param - The main parameter.
 * @returns The result of the function.
 * @throws A {@link TypeError} If the parameter is invalid.
 * @example
 * ```typescript
 * const result = mockFunction<string>('hello');
 * console.log(result); // 'processed: hello'
 * ```
 * @deprecated Use {@link newMockFunction} instead.
 * @see {@link MockClass.publicMethod} for similar functionality.
 */
export function mockFunction<TypeT>(param: TypeT): TypeT;

/**
 * Overloaded version with string parameter.
 *
 * @param param - The string parameter.
 * @returns The processed string.
 */
export function mockFunction(param: string): string;

/**
 * Overloaded version with number parameter.
 *
 * @param param - The number parameter.
 * @returns The doubled number.
 */
export function mockFunction(param: number): number;

/**
 * The implementation of the overloaded function.
 *
 * @param param - The parameter of any type.
 * @returns The result based on type.
 */
export function mockFunction<TypeT>(param: TypeT): TypeT {
    if (typeof param === 'string') {
        return `processed: ${param}` as TypeT;
    }
    if (typeof param === 'number') {
        return (param * 2) as TypeT;
    }
    return param;
}

/**
 * A function with rest parameters and optional parameters.
 *
 * @param required - The required parameter.
 * @param optional - The optional parameter.
 * @param rest - The rest parameters.
 * @returns The concatenated result.
 * @example
 * ```typescript
 * const result = mockFunctionWithRest('a', 'b', 'c', 'd');
 * console.log(result); // 'a-b-c-d'
 * ```
 */
export function mockFunctionWithRest(required: string, optional?: string, ...rest: string[]): string {
    return [required, optional, ...rest].filter(Boolean).join('-');
}

/**
 * A simple method decorator factory used for testing decorator extraction.
 *
 * @decorator
 * @example
 * ```typescript
 * class Example {
 *   \@LogDecorator()
 *   method() {}
 * }
 * ```
 */
export function LogDecorator(): MethodDecorator {
    return function (_target: object, _propertyKey: string | symbol, _descriptor: PropertyDescriptor): void {
        // Mock decorator implementation for testing
    };
}

/**
 * An async function.
 *
 * @param value - The value to process.
 * @returns A promise resolving to the processed value.
 * @internal
 */
export async function asyncMockFunction(value: string): Promise<string> {
    return Promise.resolve(`async: ${value}`);
}
