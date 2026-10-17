import { readdirSync, statSync } from 'node:fs';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

// scaffold deletes this directory when writing fails; later failures keep it
export function claimTarget(target: string): { existed: boolean } {
    const found = statSync(target, { throwIfNoEntry: false });
    if (found === undefined) return { existed: false };

    if (found.isDirectory() && readdirSync(target).length === 0) return { existed: true };

    throw new SeedcordError(SeedcordErrorCode.CreateTargetNotEmpty, [target]);
}
