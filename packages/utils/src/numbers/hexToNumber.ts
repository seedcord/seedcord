import { SeedcordError, SeedcordErrorCode, SeedcordTypeError } from '@seedcord/services';

/**
 * Converts hexcode to number
 *
 * @param hex - The hex code to convert.
 * @returns The converted number.
 */
export function hexToNumber(hex: string): number {
    if (typeof hex !== 'string') {
        throw new SeedcordTypeError(SeedcordErrorCode.UtilHexInputType);
    }

    const normalized = hex.replace(/^#/, '');
    if (!/^[0-9a-fA-F]+$/.test(normalized)) {
        throw new SeedcordError(SeedcordErrorCode.UtilHexInvalid);
    }

    const converted = parseInt(normalized, 16);
    if (Number.isNaN(converted)) {
        throw new SeedcordError(SeedcordErrorCode.UtilHexInvalid);
    }

    return converted;
}
