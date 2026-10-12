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
    const { suffixes = ['K', 'M', 'B', 'T', 'Q'], precision: rawPrecision = 1 } = opts ?? {};

    if (num < 1000) {
        return num.toString();
    }

    // Clamp to a practical range; non-finite values fall back to the default.
    // Values above \~15 exceed Number precision, so further digits are noise.
    const maxPrecision = 15;
    const precision = Number.isFinite(rawPrecision)
        ? Math.max(0, Math.min(maxPrecision, Math.trunc(rawPrecision)))
        : 1;

    let index = -1;
    let temp = num;

    while (temp >= 1000 && index < suffixes.length - 1) {
        temp /= 1000;
        index++;
    }

    // Reliable decimal rounding that avoids binary floating-point artifacts.
    let rounded = Number(Math.round(Number(temp + 'e' + precision)) + 'e-' + precision);

    // Carry into the next denomination only when a further suffix exists.
    if (rounded >= 1000 && index < suffixes.length - 1) {
        rounded /= 1000;
        index++;
        rounded = Number(Math.round(Number(rounded + 'e' + precision)) + 'e-' + precision);
    }

    let result: string;
    // eslint-disable-next-line unicorn/prefer-number-is-safe-integer -- '% 1 === 0' means whole-number, which isSafeInteger would narrow to the safe range and mis-format very large integers
    if (rounded % 1 === 0) {
        result = rounded.toString();
    } else {
        result = rounded.toFixed(precision).replace(/\.?0+$/, '');
    }

    return result + (index >= 0 ? suffixes[index] : '');
}
