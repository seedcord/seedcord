/**
 * Function takes an array of strings or numbers and returns the number of characters in the longest string/number
 *
 * @returns The length of the longest element when converted to string, or `0` for an empty array.
 *
 * @example
 * ```ts
 * longestStringLength(['ab', 12345]); // 5
 * ```
 */
export function longestStringLength(arr: (string | number)[]): number {
    // Math.max() with no arguments is -Infinity
    return arr.reduce<number>((longest, el) => Math.max(longest, el.toString().length), 0);
}
