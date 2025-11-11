/**
 * Takes two numbers and returns the percentage of the first number in the second number with two decimal places.
 *
 * @param num1 - The first number.
 * @param num2 - The second number.
 *
 * @returns The percentage of the first number in the second number with two decimal places.
 */
export function percentage(num1: number, num2: number): number {
    return Number(((num1 / num2) * 100).toFixed(2));
}
