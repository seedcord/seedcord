import { EdgeBuild } from './EdgeBuild';
import { ExportBuild } from './ExportBuild';
import { StartBuild, startsItself } from './StartBuild';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { Project } from '#core/project/Project';

export type Build = EdgeBuild | StartBuild | ExportBuild;

// runs before any plugin in vitePlugins starts
export function checkBuildTarget(config: ResolvedSeedcordConfig): void {
    const { target } = config;
    if (target.kind === 'edge') EdgeBuild.check(config);
    else if (startsItself(target)) StartBuild.check(config, target);
    else ExportBuild.check(config, target);
}

export function targetBuildFor(project: Project): Build {
    const { target } = project.config;
    if (target.kind === 'edge') return new EdgeBuild(project, target);
    return startsItself(target) ? new StartBuild(project, target) : new ExportBuild(project, target);
}
