import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { isInside } from '@seedcord/utils/node/internal';

import { ENTRY_FILE_NAME } from './seedcordEntry';

function isSafeToEmpty(outDir: string): boolean {
    return !existsSync(outDir) || readdirSync(outDir).length === 0 || existsSync(join(outDir, ENTRY_FILE_NAME));
}

// vite empties outDir before it writes
export function assertOutDirSafe(outDir: string, root: string): void {
    if (isInside(outDir, root)) throw new SeedcordError(SeedcordErrorCode.CliConfigOutDirDeletesRoot, [outDir, root]);
    if (!isSafeToEmpty(outDir)) throw new SeedcordError(SeedcordErrorCode.CliBuildOutDirNotEmpty, [outDir]);
}
