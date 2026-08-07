/**
 * Takes two numbers and returns the percentage of the first number in the second number with two decimal places.
 *
 * @example
 * ```ts
 * percentage(25, 200); // 12.5
 * percentage(1, 3); // 33.33
 * ```
 */
export function percentage(num1: number, num2: number): number {
    return Number(((num1 / num2) * 100).toFixed(2));
}
