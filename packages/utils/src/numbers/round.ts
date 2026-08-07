/**
 * Rounds a number to a specified number of decimal places.
 *
 * @example
 * ```ts
 * round(3.14159, 2); // 3.14
 * round(2.5, 0); // 3
 * ```
 */
export function round(num: number, precision: number): number {
    const factor = Math.pow(10, precision);
    return Math.round((num + Number.EPSILON) * factor) / factor;
}
