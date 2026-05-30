/**
 * Exhaustiveness guard for discriminated unions. Place in the `default` branch of a `switch` over a
 * union's discriminant: if a new variant is added without a matching case, the call fails to compile.
 * Throws at runtime if reached with a value the types said was impossible.
 */
export function assertNever(value: never): never {
    throw new Error(`Unhandled discriminated union member: ${JSON.stringify(value)}`);
}
