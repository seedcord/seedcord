/**
 * Shuffles an array using the Fisher-Yates algorithm.
 * This function creates a new array with the same elements in a random order,
 * without modifying the original array.
 *
 * @typeParam TArray - The type of elements in the array
 * @param items - The array to shuffle
 * @returns A new array with the same elements in a random order
 *
 * @example
 * ```typescript
 * const numbers = [1, 2, 3, 4, 5];
 * const shuffled = fyShuffle(numbers);
 * // shuffled might be [3, 1, 5, 2, 4]
 * // numbers is still [1, 2, 3, 4, 5]
 * ```
 */
export function fyShuffle<TArray>(items: TArray[]): TArray[] {
    const array = items.slice();
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        // @ts-expect-error - TypeScript doesn't recognize that TArray can be swapped
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
