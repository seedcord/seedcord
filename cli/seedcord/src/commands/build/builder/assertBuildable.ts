import { statSync } from 'node:fs';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { BotLayout } from '@seedcord/utils/internal';

import type { Project } from '#core/project/Project';
import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { SeedcordErrorArguments } from '@seedcord/errors/internal';

type ListedFolderProblem = SeedcordErrorArguments<SeedcordErrorCode.CliListedFolderUnusable>[1];

function listedFolderProblem(folder: string): ListedFolderProblem | undefined {
    const stats = statSync(folder, { throwIfNoEntry: false });
    if (!stats) return 'missing';
    return stats.isDirectory() ? undefined : 'file';
}

function* listedFolderProblems({ config }: Project): Generator<SeedcordError> {
    for (const folder of config.files) {
        const problem = listedFolderProblem(folder);
        if (problem) yield new SeedcordError(SeedcordErrorCode.CliListedFolderUnusable, [folder, problem]);
    }
}

// utils keys a built bot's modules by the name each one built to
async function builtNameClashes(files: ProjectFiles): Promise<SeedcordError[]> {
    const modulePaths = await files.modulePaths();
    const byBuiltName = Map.groupBy(
        modulePaths.map((path) => files.layout.keyOf(path)),
        (key) => BotLayout.builtPath(key)
    );
    return [...byBuiltName]
        .filter(([, sources]) => sources.length > 1)
        .map(
            ([built, sources]) =>
                new SeedcordError(SeedcordErrorCode.CoreDuplicateName, [
                    'built file',
                    built,
                    sources.map((source) => paint.path(source)),
                    'Every code extension builds to a .js file.'
                ])
        );
}

export async function assertBuildable(project: Project): Promise<void> {
    const problems = [...listedFolderProblems(project), ...(await builtNameClashes(project.files))];
    throwSingleOrAggregate(problems, SeedcordErrorCode.CliProblems);
}
