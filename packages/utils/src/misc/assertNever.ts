/**
 * Exhaustiveness guard for discriminated unions. Place in the `default` branch of a `switch` over a
 * union's discriminant: if a new variant is added without a matching case, the call fails to compile.
 * Throws at runtime if reached with a value the types said was impossible.
 *
 * @example
 * ```ts
 * type Shape = { kind: 'circle' } | { kind: 'square' };
 *
 * function area(shape: Shape): number {
 *   switch (shape.kind) {
 *     case 'circle': return Math.PI;
 *     case 'square': return 1;
 *     default: return assertNever(shape); // compile error if a Shape variant is added
 *   }
 * }
 * ```
 */
export function assertNever(value: never): never {
    throw new Error(`Unhandled discriminated union member: ${JSON.stringify(value)}`);
}
