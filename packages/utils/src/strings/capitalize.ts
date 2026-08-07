/**
 * Returns the word with its first letter capitalized and the rest in lowercase.
 *
 * @example
 * ```ts
 * capitalize('hELLO'); // 'Hello'
 * ```
 */
export function capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
