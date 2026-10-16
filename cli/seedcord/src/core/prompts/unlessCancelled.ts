import { isSeedcordError, paint, SeedcordErrorCode } from '@seedcord/errors';

interface LineOutput {
    line(text?: string): void;
}

// prints cancelled and returns undefined when the user cancels a prompt in the task
export async function unlessCancelled<Result>(
    output: LineOutput,
    task: () => Promise<Result>
): Promise<Result | undefined> {
    try {
        return await task();
    } catch (error: unknown) {
        if (!isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.CliCancelled)) throw error;
        output.line(paint.mute('cancelled'));
        return undefined;
    }
}
