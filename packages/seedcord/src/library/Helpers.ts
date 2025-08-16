import { readdir } from 'node:fs/promises';
import * as path from 'node:path';

import { DatabaseError } from '../bot/errors/Database';
import { Logger } from '../services/Logger';

// @ts-expect-error - TS thinks it's unused. But it's used in TSDoc
//  eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { CustomErrorConstructor, CustomError } from '../interfaces/Components';
import type * as fs from 'node:fs';

/**
 * Rounds a number to a specified number of decimal places.
 *
 * @param num - The number to be rounded.
 * @param decimalPlaces - The number of decimal places to round to.
 * @returns The rounded number.
 */
export function numberFixer(num: number, decimalPlaces: number): number {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

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

/**
 * Generates an ASCII table from the provided data.
 *
 * @param data - The data to be displayed in the table.
 * @returns The generated ASCII table as a string.
 */
export function generateAsciiTable(data: string[][]): string {
  if (data.length === 0) return '';

  const firstRow = data[0];
  if (!firstRow || firstRow.length === 0) return '';

  let table = '';
  const columnWidths: number[] = [];

  // Determine the maximum width for each column
  for (let i = 0; i < firstRow.length; i++) {
    let maxWidth = 0;
    for (const row of data) {
      const cell = row[i];
      if (cell !== undefined) maxWidth = Math.max(maxWidth, cell.length);
    }
    columnWidths.push(maxWidth);
  }

  // Function to create a horizontal line
  const createLine = (char: string, left: string, intersect: string, right: string): string => {
    let line = left;
    columnWidths.forEach((width, index) => {
      line += char.repeat(width + 2);
      if (index < columnWidths.length - 1) line += intersect;
      else line += right;
    });
    line += '\n';
    return line;
  };

  // Top border
  table += createLine('═', '╔', '╦', '╗');

  data.forEach((row, rowIndex) => {
    // Row content
    table += '║';
    row.forEach((cell, columnIndex) => {
      const columnWidth = columnWidths[columnIndex];
      if (columnWidth !== undefined) table += ` ${cell.padEnd(columnWidth)} ║`;
    });
    table += '\n';

    // Separator or bottom border
    if (rowIndex < data.length - 1) table += createLine('─', '╠', '╬', '╣');
    else table += createLine('═', '╚', '╩', '╝');
  });

  return table;
}

/**
 * Returns the word with it's first letter capitalized and the rest in lowercase.
 * @param word - The word to be formatted.
 * @returns The formatted word.
 */
export function formatWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Function takes an array of strings or numbers and returns the number of characters in the longest string/number
 * @param arr - The array of strings or numbers
 */
export function longestStringLength(arr: (string | number)[]): number {
  return Math.max(...arr.map((el) => el.toString().length));
}

/**
 * Return current time in seconds
 */
export function currentTime(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Returns the ordinal suffix for a given number.
 *
 * @param n - The number to get the ordinal for
 * @returns The number with its ordinal suffix
 *
 * @example
 * ordinal(1); // "1st"
 * ordinal(22); // "22nd"
 * ordinal(13); // "13th"
 */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  const index = (v - 20) % 10;
  const suffix = s[index] ?? s[v] ?? s[0];
  if (!suffix) return `${n}th`;

  return `${n}${suffix}`;
}

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

/**
 * Determines if a directory entry is a TypeScript or JavaScript file.
 *
 * @param entry - The directory entry to check.
 * @returns True if the entry is a file ending with .ts or .js.
 */
export function isTsOrJsFile(entry: fs.Dirent): boolean {
  return (
    entry.isFile() &&
    (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) &&
    !entry.name.endsWith('.d.ts') &&
    !entry.name.endsWith('.map')
  );
}

/**
 * Recursively traverses through a directory, importing all .ts and .js files and applying a callback to each import.
 *
 * @param dir - The directory path to traverse.
 * @param callback - A function that will be called for each imported module. It receives the full file path, the file's relative path, and the imported module as arguments.
 * @returns A Promise that resolves when the traversal is complete.
 */
export async function traverseDirectory(
  dir: string,
  callback: (fullPath: string, relativePath: string, imported: Record<string, unknown>) => Promise<void> | void
): Promise<void> {
  let entries: fs.Dirent[];

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    Logger.Error('Failed to read directory', dir);
    entries = [];
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(process.cwd(), fullPath);

    if (entry.isDirectory()) {
      await traverseDirectory(fullPath, callback);
    } else if (isTsOrJsFile(entry)) {
      const imported = (await import(fullPath)) as Record<string, unknown>;
      await callback(fullPath, relativePath, imported);
    }
  }
}

/**
 * Throws a custom error with a formatted message and optional UUID.
 *
 * Wraps an unknown error in a {@link CustomError} subclass. If the error class
 * is {@link DatabaseError}, a UUID is generated and passed to the constructor.
 *
 * @typeParam T - A constructor for a {@link CustomError} subclass
 * @param error - The original error or value
 * @param message - Custom message to include
 * @param CustomError - Error class to instantiate and throw
 * @throws Instance of the provided {@link CustomError} subclass
 *
 * @example
 * ```typescript
 * try {
 *   // risky code
 * } catch (e) {
 *   throwCustomError(e, "Something went wrong", MyCustomError);
 * }
 * ```
 */
export function throwCustomError<Ctor extends CustomErrorConstructor>(
  error: unknown,
  message: string,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  CustomError: Ctor
): never {
  const uuid = crypto.randomUUID();
  Logger.Error('Throwing Custom Error', (error as Error).name);

  if (typeof CustomError === typeof DatabaseError) {
    const errorMessage = error instanceof Error ? error.message : message;
    throw new CustomError(errorMessage, uuid);
  } else {
    if (error instanceof Error) {
      throw new CustomError(`${message}: ${error.message ? error.message : error.toString()}`);
    } else {
      throw new CustomError(message);
    }
  }
}

/**
 * Converts a camelCase or snake_case string into a human-readable format.
 *
 * This function inserts spaces before capital letters that follow lowercase
 * letters, replaces underscores with spaces, and trims any extra whitespace.
 *
 * @param key - The string to be converted to a human-readable format
 * @returns A prettified string with proper spacing
 *
 * @example
 * prettify("camelCaseString") // returns "camel Case String"
 * @example
 * prettify("snake_case_string") // returns "snake case string"
 */
export function prettify(key: string): string {
  // Insert a space before each capital that follows a lower-case letter
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ') // handle any snake_case
    .trim();
}

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
