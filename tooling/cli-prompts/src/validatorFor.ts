import { isSeedcordError } from '@seedcord/errors';

import type { SeedcordErrorCode } from '@seedcord/errors';
import type { NonEmptyTuple } from 'type-fest';

export function validatorFor(
    retypeCodes: NonEmptyTuple<SeedcordErrorCode>,
    check: (value: string) => void
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
