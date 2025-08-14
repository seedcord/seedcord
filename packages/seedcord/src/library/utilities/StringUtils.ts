export class StringUtils {
  /**
   * Returns the word with it's first letter capitalized and the rest in lowercase.
   * @param word - The word to be formatted.
   * @returns The formatted word.
   */
  public static capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  /**
   * Function takes an array of strings or numbers and returns the number of characters in the longest string/number
   * @param arr - The array of strings or numbers
   */
  public static longestStringLength(arr: (string | number)[]): number {
    return Math.max(...arr.map((el) => el.toString().length));
  }
}
