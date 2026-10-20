import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

/**
 * Exhaustiveness guard for discriminated unions. Place in the `default` branch of a `switch` over a
 * union's discriminant: if a new variant is added without a matching case, the call fails to compile.
 *
 * @throws A **SeedcordTypeError** whenever it runs. Only a value the types ruled out can reach it.
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
    throw new SeedcordTypeError(SeedcordErrorCode.UtilUnhandledUnionMember, [JSON.stringify(value)]);
}
