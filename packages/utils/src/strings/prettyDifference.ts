/**
 * Calculates the difference between two numbers and formats it as a string with a '+' prefix for positive differences.
 *
 * @param numBefore - The initial number value
 * @param numAfter - The final number value
 * @returns A string representing the difference, with a '+' sign for positive differences
 *
 * @example
 * // Returns "+5"
 * prettyDifference(10, 15);
 *
 * @example
 * // Returns "-3"
 * prettyDifference(10, 7);
 */

export function prettyDifference(numBefore: number, numAfter: number): string {
  return (numAfter - numBefore > 0 ? `+${numAfter - numBefore}` : numAfter - numBefore).toString();
}
