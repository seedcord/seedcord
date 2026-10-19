import { opendirSync } from 'node:fs';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

// node's message says whether the path is missing or is a file
function* unreadableFolders(folders: string[]): Generator<SeedcordError> {
    for (const folder of folders) {
        try {
            opendirSync(folder).closeSync();
        } catch (error: unknown) {
            yield new SeedcordError(SeedcordErrorCode.CorePathUnreadable, [folder, asError(error).message], {
                cause: error
            });
        }
    }
}

export function assertListedFoldersExist(files: string[]): void {
    throwSingleOrAggregate([...unreadableFolders(files)], SeedcordErrorCode.CliProblems);
}
