import { EdgeBuild } from './EdgeBuild';
import { ServerBuild } from './ServerBuild';

import type { Project } from '#core/project/Project';
import type { EdgeBuildDeps } from './EdgeBuild';

export type Build = EdgeBuild | ServerBuild;

export function targetBuildFor(project: Project, edgeDeps?: Partial<EdgeBuildDeps>): Build {
    const { target } = project.config;
    if (target.kind === 'edge') return new EdgeBuild(project, target, edgeDeps);
    return new ServerBuild(project, target.entry);
}
