import { assertBuildable } from './assertBuildable';
import { EdgeBuild } from './EdgeBuild';
import { ExportBuild } from './ExportBuild';
import { StartBuild, startsItself } from './StartBuild';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { Project } from '#core/project/Project';

export type Build = EdgeBuild | StartBuild | ExportBuild;

interface BuildKind {
    check(): void;
    create(project: Project): Build;
}

function buildKindFor(config: ResolvedSeedcordConfig): BuildKind {
    const { target } = config;
    if (target.kind === 'edge') {
        return { check: () => EdgeBuild.check(config), create: (project) => new EdgeBuild(project, target) };
    }
    if (startsItself(target)) {
        return { check: () => StartBuild.check(config, target), create: (project) => new StartBuild(project, target) };
    }
    return { check: () => ExportBuild.check(config, target), create: (project) => new ExportBuild(project, target) };
}

export async function checkBuildTarget(project: Project): Promise<void> {
    buildKindFor(project.config).check();
    await assertBuildable(project);
}

export function targetBuildFor(project: Project): Build {
    return buildKindFor(project.config).create(project);
}
