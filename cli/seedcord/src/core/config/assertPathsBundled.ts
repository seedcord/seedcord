import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { isInside } from '@seedcord/utils/internal';

import type { Project } from '#core/project/Project';

export function assertPathsBundled({ config, files }: Project): void {
    const { target, root } = config;
    if (target.kind === 'server' && isInside(target.outDir, root)) {
        throw new SeedcordError(SeedcordErrorCode.CliConfigOutDirDeletesRoot, [target.outDir, root]);
    }
    const start = target.kind === 'server' && target.start !== undefined ? [target.start] : [];
    const problems = [...config.files, ...start].flatMap((path) => files.layout.bundleProblem(path) ?? []);
    throwSingleOrAggregate(problems, SeedcordErrorCode.CliProblems);
}
