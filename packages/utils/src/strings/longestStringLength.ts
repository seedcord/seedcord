/**
 * Function takes an array of strings or numbers and returns the number of characters in the longest string/number
 *
 * @returns The length of the longest element when converted to string
 *
 * @example
 * ```ts
 * longestStringLength(['ab', 12345]); // 5
 * ```
 */
export function longestStringLength(arr: (string | number)[]): number {
    return Math.max(...arr.map((el) => el.toString().length));
}
