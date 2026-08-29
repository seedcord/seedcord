export interface RoundToDenomOptions {
    /**
     * Suffixes to use for each denomination level, one per thousand. Shortening stops at the last one,
     * so a shorter list leaves a larger number in front of it.
     *
     * @defaultValue `['K', 'M', 'B', 'T', 'Q']`
     */
    suffixes?: readonly string[];
    /**
     * Number of decimal places to include in the rounded result.
     *
     * @defaultValue `1`
     */
    precision?: number;
}

/**
 * Rounds a number to a string representation with a denomination suffix.
 *
 * A number below 1000 comes back as its own digits.
 *
 * @example
 * ```ts
 * roundToDenomination(999); // "999"
 * roundToDenomination(1234); // "1.2K"
 * roundToDenomination(10000, { suffixes: ['k', 'm', 'b', 't', 'q'] }); // "10k"
 * roundToDenomination(12345678); // "12.3M"
 * ```
 */
export function roundToDenomination(num: number, opts?: RoundToDenomOptions): string {
    const { suffixes = ['K', 'M', 'B', 'T', 'Q'], precision = 1 } = opts ?? {};

    if (num < 1000) {
        return num.toString();
    }

    let index = -1;
    let temp = num;

    while (temp >= 1000 && index < suffixes.length - 1) {
        temp /= 1000;
        index++;
    }

    let result;

    // eslint-disable-next-line unicorn/prefer-number-is-safe-integer -- '% 1 === 0' means whole-number, which isSafeInteger would narrow to the safe range and mis-format very large integers
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
        result = result.slice(0, Math.max(0, result.length - 2));
    }

    if (result === '1000') {
        index += 1;
        result = '1';
    }

    return result + (index >= 0 ? suffixes[index] : '');
}
