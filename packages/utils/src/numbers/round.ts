/**
 * Rounds a number to a specified number of decimal places.
 *
 * @param num - The number to be rounded.
 * @param precision - The number of decimal places to round to.
 * @returns The rounded number.
 */

export function round(num: number, precision: number): number {
    const factor = Math.pow(10, precision);
    return Math.round((num + Number.EPSILON) * factor) / factor;
}
