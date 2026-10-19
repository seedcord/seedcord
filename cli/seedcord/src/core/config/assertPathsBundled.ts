import { SeedcordErrorCode } from '@seedcord/errors';
import { throwSingleOrAggregate } from '@seedcord/errors/internal';

import type { Project } from '#core/project/Project';

export function assertPathsBundled({ config, files }: Project): void {
    const { target } = config;
    const start = target.kind === 'server' && target.start !== undefined ? [target.start] : [];
    const problems = [...config.files, ...start].flatMap((path) => files.layout.bundleProblem(path) ?? []);
    throwSingleOrAggregate(problems, SeedcordErrorCode.CliProblems);
}
