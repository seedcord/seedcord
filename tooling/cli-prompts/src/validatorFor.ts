import { isSeedcordError } from '@seedcord/errors';

import type { SeedcordErrorCode } from '@seedcord/errors';

export function validatorFor(
    retypeCodes: readonly [SeedcordErrorCode, ...SeedcordErrorCode[]],
    check: (value: string) => unknown
): (value: string) => string | undefined {
    return (value) => {
        try {
            check(value);
            return undefined;
        } catch (error) {
            if (isSeedcordError(error) && retypeCodes.includes(error.code)) return error.message;
            throw error;
        }
    };
}
