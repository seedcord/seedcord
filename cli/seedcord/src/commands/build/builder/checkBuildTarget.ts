import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { isInside } from '@seedcord/utils/node/internal';

import { assertOutDirSafe } from './assertOutDirSafe';

import type { ResolvedSeedcordConfig } from '#core/config/schema';

export function checkBuildTarget({ target, root, configFile }: ResolvedSeedcordConfig): void {
    if (target.kind === 'server') {
        if (!existsSync(target.entry)) throw new SeedcordError(SeedcordErrorCode.CliEntryNotFound, [target.entry]);
        assertOutDirSafe(target.outDir, root);
        return;
    }
    if (isInside(root, dirname(configFile))) {
        throw new SeedcordError(SeedcordErrorCode.CliEdgeRootHoldsConfig, [configFile, root]);
    }
}
