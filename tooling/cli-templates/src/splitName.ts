import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

const FOLDER = /^[\w -]+$/;
const NAME = /^[A-Za-z][\w -]*$/;

interface SplitName {
    readonly folder: string;
    readonly name: string;
}

export function splitName(nameWithFolder: string): SplitName {
    const folders = nameWithFolder.split('/');
    const name = folders.pop() ?? '';
    if (!NAME.test(name) || !folders.every((folder) => FOLDER.test(folder) && folder.trim() === folder)) {
        throw new SeedcordTypeError(SeedcordErrorCode.MakeInvalidName, [nameWithFolder]);
    }
    return { folder: folders.join('/'), name };
}
