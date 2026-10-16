import { isSeedcordError, paint, SeedcordErrorCode } from '@seedcord/errors';

interface LineOutput {
    line(text?: string): void;
}

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
