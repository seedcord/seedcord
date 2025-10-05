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
