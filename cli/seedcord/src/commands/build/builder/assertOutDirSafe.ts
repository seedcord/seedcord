import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { BUILT_FILES_KEY, isInside } from '@seedcord/utils/node/internal';

import { ENTRY_FILE_NAME } from './output';

function holdsEarlierBuild(outDir: string): boolean {
    const entry = join(outDir, ENTRY_FILE_NAME);
    const entryIsFile = statSync(entry, { throwIfNoEntry: false })?.isFile() === true;
    return entryIsFile && readFileSync(entry, 'utf8').includes(BUILT_FILES_KEY);
}

function realPath(path: string): string {
    return existsSync(path) ? realpathSync(path) : path;
}

function outDirHoldsRoot(outDir: string, root: string): boolean {
    return isInside(realPath(outDir), realPath(root));
}

function isSafeToEmpty(outDir: string): boolean {
    return !existsSync(outDir) || readdirSync(outDir).length === 0 || holdsEarlierBuild(outDir);
}

// vite empties outDir before it writes
export function assertOutDirSafe(outDir: string, root: string): void {
    if (outDirHoldsRoot(outDir, root)) {
        throw new SeedcordError(SeedcordErrorCode.CliConfigOutDirDeletesRoot, [outDir, root]);
    }
    if (!isSafeToEmpty(outDir)) throw new SeedcordError(SeedcordErrorCode.CliBuildOutDirNotEmpty, [outDir]);
}
