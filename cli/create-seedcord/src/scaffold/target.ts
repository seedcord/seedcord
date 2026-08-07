import { readdir, stat } from 'node:fs/promises';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

// an empty target is what lets the cleanup remove everything it finds
export async function claimTarget(target: string): Promise<void> {
    const found = await stat(target).catch(() => null);
    if (found === null) return;

    if (found.isDirectory()) {
        const entries = await readdir(target);
        if (entries.length === 0) return;
    }

    throw new SeedcordError(SeedcordErrorCode.CreateTargetNotEmpty, [target]);
}
