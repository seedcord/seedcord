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
     * Values are truncated toward zero and clamped to the range 0–15.
     * Non-finite values (NaN, ±Infinity) fall back to the default of 1.
     * Precision above 15 is not useful: Number only has about 15–17 significant digits.
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

    // Truncate and clamp; non-finite falls back to the documented default.
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

    let rounded = roundToPrecision(temp, precision);

    // Carry into the next denomination only when a further suffix exists.
    if (rounded >= 1000 && index < suffixes.length - 1) {
        rounded = roundToPrecision(rounded / 1000, precision);
        index++;
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

/**
 * Round `value` to `precision` decimal places.
 *
 * Uses a decimal shift for ordinary magnitudes (avoids binary floating-point
 * artifacts). When the magnitude is large enough that the shift would leave
 * the safe-integer range or produce Infinity, falls back to integer rounding
 * because further decimal places are meaningless.
 */
function roundToPrecision(value: number, precision: number): number {
    if (precision === 0) {
        return Math.round(value);
    }

    const factor = 10 ** precision;
    if (!Number.isFinite(value * factor) || Math.abs(value) >= Number.MAX_SAFE_INTEGER / factor) {
        return Math.round(value);
    }

    const shifted = Math.round(Number(value + 'e' + precision));
    return Number(shifted + 'e-' + precision);
}
