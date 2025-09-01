/**
 * Returns the word with it's first letter capitalized and the rest in lowercase.
 * @param word - The word to be formatted.
 * @returns The formatted word.
 */
export function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
