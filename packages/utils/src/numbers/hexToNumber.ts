/**
 * Converts hexcode to number
 *
 * @param hex - The hex code to convert.
 * @returns The converted number.
 */
export function hexToNumber(hex: string): number {
    if (typeof hex !== 'string') {
        throw new TypeError('hexToNumber expects a string input');
    }

    const normalized = hex.replace(/^#/, '');
    if (!/^[0-9a-fA-F]+$/.test(normalized)) {
        throw new Error('Invalid hex string');
    }

    const converted = parseInt(normalized, 16);
    if (Number.isNaN(converted)) {
        throw new Error('Invalid hex string');
    }

    return converted;
}
