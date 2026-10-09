import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, throwSingleOrAggregate } from '@seedcord/errors/internal';

import { ProjectFiles } from '#core/project/ProjectFiles';

import type { ResolvedSeedcordDevConfig } from './schema';

export async function assertNoHashPaths({ root, configFile, build }: ResolvedSeedcordDevConfig): Promise<void> {
    if (root.includes('#')) throw new SeedcordError(SeedcordErrorCode.CliPathHasHash, [root]);
    if (!existsSync(root)) return;

    const paths = await new ProjectFiles(root, build.outDir, dirname(configFile)).pathsWithHash();
    const problems = paths.map((path) => new SeedcordError(SeedcordErrorCode.CliPathHasHash, [path]));
    throwSingleOrAggregate(problems, SeedcordErrorCode.CliHashPathProblems);
}
