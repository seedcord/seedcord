import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';

export interface Failure {
    code: number;
    message: string | null;
}

// nothing reaches disk until the interview ends
const CANCELLED: Failure = { code: 0, message: null };

export function reportFailure(error: unknown): Failure {
    if (isSeedcordError(error, undefined, SeedcordErrorCode.CreateCancelled)) return CANCELLED;
    if (isSeedcordError(error) || Error.isError(error)) return { code: 1, message: error.message };

    return { code: 1, message: String(error) };
}
