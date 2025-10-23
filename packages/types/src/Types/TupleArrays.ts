/**
 * Extracts all parameters after the first one from a tuple type
 * @typeParam TArgs - The tuple type to extract the tail from
 *
 * @example
 * ```ts
 * type Example = [number, string, boolean];
 * type Result = Tail<Example>; // Result: [string, boolean]
 * ```
 */
export type Tail<TArgs extends unknown[]> = TArgs extends [unknown, ...infer R] ? R : never;
