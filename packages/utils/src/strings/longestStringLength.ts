/**
 * Function takes an array of strings or numbers and returns the number of characters in the longest string/number
 *
 * @param arr - The array of strings or numbers
 * @returns The length of the longest element when converted to string
 */
export function longestStringLength(arr: (string | number)[]): number {
    return Math.max(...arr.map((el) => el.toString().length));
}
