/**
 * Generates a random numeric code with the specified number of digits.
 *
 * @param digits - The number of digits for the generated code.
 * @returns A random numeric code with the specified number of digits.
 */
export function generateCode(digits: number): number {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min);
}
