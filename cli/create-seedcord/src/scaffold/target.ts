import { readdir, stat } from 'node:fs/promises';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

// scaffold deletes this directory when a step fails
export async function claimTarget(target: string): Promise<{ existed: boolean }> {
    const found = await stat(target).catch(() => null);
    if (found === null) return { existed: false };

    if (found.isDirectory()) {
        const entries = await readdir(target);
        if (entries.length === 0) return { existed: true };
    }

    throw new SeedcordError(SeedcordErrorCode.CreateTargetNotEmpty, [target]);
}
