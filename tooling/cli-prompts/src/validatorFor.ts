import { isSeedcordError } from '@seedcord/errors';

import type { SeedcordErrorCode } from '@seedcord/errors';

// answerErrors are the codes another answer can fix. anything else rejects the prompt
export function validatorFor(
    answerErrors: readonly [SeedcordErrorCode, ...SeedcordErrorCode[]],
    check: (value: string) => unknown
): (value: string) => string | undefined {
    return (value) => {
        try {
            check(value);
            return undefined;
        } catch (error) {
            if (isSeedcordError(error) && answerErrors.includes(error.code)) return error.message;
            throw error;
        }
    };
}
