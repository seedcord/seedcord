import { existsSync } from 'node:fs';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, throwSingleOrAggregate } from '@seedcord/errors/internal';

import type { Project } from '#core/project/Project';

export async function assertNoHashPaths({ config, files }: Project): Promise<void> {
    const { root } = config;
    if (root.includes('#')) throw new SeedcordError(SeedcordErrorCode.CliPathHasHash, [root]);
    if (!existsSync(root)) return;

    const paths = await files.pathsWithHash();
    const problems = paths.map((path) => new SeedcordError(SeedcordErrorCode.CliPathHasHash, [path]));
    throwSingleOrAggregate(problems, SeedcordErrorCode.CliHashPathProblems);
}
