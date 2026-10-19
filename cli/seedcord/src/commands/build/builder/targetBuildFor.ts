import { assertListedFoldersExist } from './assertListedFoldersExist';
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

// runs before any plugin in vitePlugins starts
export function checkBuildTarget(config: ResolvedSeedcordConfig): void {
    assertListedFoldersExist(config.files);
    buildKindFor(config).check();
}

export function targetBuildFor(project: Project): Build {
    return buildKindFor(project.config).create(project);
}
