import { EdgeBuild } from './EdgeBuild';
import { ServerBuild } from './ServerBuild';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { Project } from '#core/project/Project';

export type Build = EdgeBuild | ServerBuild;

// runs before any plugin in vitePlugins starts
export function checkBuildTarget(config: ResolvedSeedcordConfig): void {
    const { target } = config;
    if (target.kind === 'edge') EdgeBuild.check(config);
    else ServerBuild.check(config, target);
}

export function targetBuildFor(project: Project): Build {
    const { target } = project.config;
    if (target.kind === 'edge') return new EdgeBuild(project, target);
    return new ServerBuild(project, target);
}
