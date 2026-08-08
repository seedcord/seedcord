import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';

export interface Failure {
    code: number;
    message: string | null;
    closing: string;
}

// nothing reaches disk until the interview ends
const CANCELLED: Failure = { code: 0, message: null, closing: 'Nothing was written.' };

export function reportFailure(error: unknown): Failure {
    if (isSeedcordError(error, undefined, SeedcordErrorCode.CreateCancelled)) return CANCELLED;

    // scaffold removes the tree it wrote before a step failure gets here
    const removed = isSeedcordError(error, undefined, SeedcordErrorCode.CreateStepFailed);
    const message = isSeedcordError(error) || Error.isError(error) ? error.message : String(error);

    return { code: 1, message, closing: removed ? 'Nothing was kept.' : 'Nothing was created.' };
}
