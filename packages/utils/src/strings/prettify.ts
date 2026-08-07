import { capitalize } from './capitalize';

/**
 * Options for the `prettify` function.
 */
export interface PrettifyOptions {
    capitalize?: boolean;
}
/**
 * Converts a string from any common naming convention to human-readable format.
 * Accepts camelCase, PascalCase, snake_case, and kebab-case input.
 *
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
        .replaceAll(/([a-z])([A-Z])/g, '$1 $2') // camelCase/PascalCase
        .replaceAll(/[_-]/g, ' ') // snake_case and kebab-case
        .trim();

    if (opts?.capitalize) return capitalize(result);

    return result;
}
