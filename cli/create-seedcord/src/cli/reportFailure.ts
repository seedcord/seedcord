import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';

export interface Failure {
    code: number;
    cancelled: boolean;
    message: string;
}

// nothing reaches disk until the interview ends
const CANCELLED: Failure = { code: 0, cancelled: true, message: 'Nothing was written.' };

export function reportFailure(error: unknown): Failure {
    if (isSeedcordError(error, undefined, SeedcordErrorCode.CreateCancelled)) return CANCELLED;

    const message = isSeedcordError(error) || Error.isError(error) ? error.message : String(error);
    return { code: 1, cancelled: false, message };
}
