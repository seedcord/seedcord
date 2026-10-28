import { readdirSync, statSync } from 'node:fs';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';

import { messageOf } from '#cli/messageOf';

function readable<Result>(read: () => Result): Result {
    try {
        return read();
    } catch (error: unknown) {
        throw new SeedcordTypeError(
            SeedcordErrorCode.CreateInvalidAnswer,
            ['dir', `${messageOf(error)}. Pick a folder you can create files in.`],
            { cause: error }
        );
    }
}

// scaffold deletes this directory when writing fails; later failures keep it
export function claimTarget(target: string): { existed: boolean } {
    const found = readable(() => statSync(target, { throwIfNoEntry: false }));
    if (found === undefined) return { existed: false };

    if (found.isDirectory() && readable(() => readdirSync(target)).length === 0) return { existed: true };

    throw new SeedcordError(SeedcordErrorCode.CreateTargetNotEmpty, [target]);
}
