import { capitalize } from './capitalize';

interface PrettifyOptions {
    capitalize?: boolean;
}
/**
 * Converts a string from any common naming convention to human-readable format.
 * Handles camelCase, PascalCase, snake_case, and kebab-case.
 *
 * @param key - The string to convert
 * @param opts - Optional configuration
 * @returns A space-separated, human-readable string
 *
 * @example
 * prettify("camelCaseString") // "camel Case String"
 * prettify("PascalCaseString") // "Pascal Case String"
 * prettify("snake_case_string") // "snake case string"
 * prettify("kebab-case-string") // "kebab case string"
 * prettify("mixedCase_string-name") // "mixed Case string name"
 */

export function prettify(key: string, opts?: PrettifyOptions): string {
    const result = key
        .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase/PascalCase
        .replace(/[_-]/g, ' ') // snake_case and kebab-case
        .trim();

    if (opts?.capitalize) return capitalize(result);

    return result;
}
