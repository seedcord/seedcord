/**
 * Filters string union types to only include those that start with a specific string
 * @typeParam BaseUnion - The union of strings to filter
 * @typeParam StartingString - The string that valid members must start with
 *
 * @example
 * ```ts
 * type Example = 'apple' | 'banana' | 'apricot' | 'cherry';
 * type Result = StartsWith<Example, 'ap'>; // Result: 'apple' | 'apricot'
 * ```
 */
export type StringStartsWith<
    BaseUnion extends string,
    StartingString extends string
> = BaseUnion extends `${StartingString}${string}` ? BaseUnion : never;

/**
 * Filters string union types to only include those that end with a specific string
 * @typeParam BaseUnion - The union of strings to filter
 * @typeParam EndingString - The string that valid members must end with
 *
 * @example
 * ```ts
 * type Example = 'apple' | 'banana' | 'apricot' | 'cherry' | 'strawberry';
 * type Result = EndsWith<Example, 'rry'>; // Result: 'cherry' | 'strawberry'
 * ```
 */
export type StringEndsWith<
    BaseUnion extends string,
    EndingString extends string
> = BaseUnion extends `${string}${EndingString}` ? BaseUnion : never;

/**
 * Filters string union types to only include those that contain a specific substring
 * @typeParam BaseUnion - The union of strings to filter
 * @typeParam Substring - The substring that valid members must contain
 *
 * @example
 * ```ts
 * type Example = 'apple' | 'banana' | 'apricot' | 'cherry' | 'strawberry';
 * type Result = Contains<Example, 'rr'>; // Result: 'cherry' | 'strawberry'
 * ```
 */
export type StringContains<
    BaseUnion extends string,
    Substring extends string
> = BaseUnion extends `${string}${Substring}${string}` ? BaseUnion : never;
