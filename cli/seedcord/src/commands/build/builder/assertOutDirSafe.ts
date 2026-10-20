import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { BOT_FILES_KEY } from '@seedcord/utils/internal';

import { ENTRY_FILE_NAME } from './output';

function holdsEarlierBuild(outDir: string): boolean {
    const entry = join(outDir, ENTRY_FILE_NAME);
    const entryIsFile = statSync(entry, { throwIfNoEntry: false })?.isFile() === true;
    return entryIsFile && readFileSync(entry, 'utf8').includes(BOT_FILES_KEY);
}

function isSafeToEmpty(outDir: string): boolean {
    return !existsSync(outDir) || readdirSync(outDir).length === 0 || holdsEarlierBuild(outDir);
}

// vite empties outDir before it writes
export function assertOutDirSafe(outDir: string): void {
    if (!isSafeToEmpty(outDir)) throw new SeedcordError(SeedcordErrorCode.CliBuildOutDirNotEmpty, [outDir]);
}
