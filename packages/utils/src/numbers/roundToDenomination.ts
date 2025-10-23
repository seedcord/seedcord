import type { TupleOf } from 'type-fest';

export interface RoundToDenomOptions {
    /**
     * Suffixes to use for each denomination level. Defaults to `['K', 'M', 'B', 'T', 'Q']`.
     */
    suffixes?: TupleOf<5, string>;
    /** Number of decimal places to include in the rounded result. Defaults to `1`. */
    precision?: number;
}

/**
 * Rounds a number to a string representation with a denomination suffix.
 * @param num - The number to round.
 * @example
 * ```ts
 * roundToDenomination(1234); // "1.2K"
 * roundToDenomination(10000, ['k', 'm', 'b', 't', 'q']); // "10k"
 * roundToDenomination(12345678); // "12.3M"
 * ```
 * @returns The rounded number as a string with a denomination suffix.
 */
export function roundToDenomination(num: number, opts?: RoundToDenomOptions): string {
    const { suffixes = ['K', 'M', 'B', 'T', 'Q'], precision = 1 } = opts ?? {};

    if (num < 10000) {
        return num.toString();
    }

    let index = -1;
    let temp = num;

    while (temp >= 1000 && index < suffixes.length - 1) {
        temp /= 1000;
        index++;
    }

    let result;

    if (temp % 1 === 0) {
        result = temp.toString();
    } else {
        const adjustedTemp = Math.round(temp * Math.pow(10, precision + 1)) / Math.pow(10, precision + 1);
        result = adjustedTemp.toFixed(precision);
    }

    if (result.endsWith('.9')) {
        result = Math.ceil(Number(result)).toString();
    }

    if (result.endsWith('.0')) {
        result = result.substring(0, result.length - 2);
    }

    if (result === '1000') {
        index += 1;
        result = '1';
    }

    return result + (index >= 0 ? suffixes[index] : '');
}
