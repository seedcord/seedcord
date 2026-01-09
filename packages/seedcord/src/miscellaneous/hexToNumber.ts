import { SeedcordErrorCode } from '@seedcord/services';
import { SeedcordError, SeedcordTypeError } from '@seedcord/services/internal';

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
