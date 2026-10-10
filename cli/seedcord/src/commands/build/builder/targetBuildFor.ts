import { EdgeBuild } from './EdgeBuild';
import { ServerBuild } from './ServerBuild';

import type { Project } from '#core/project/Project';

export type Build = EdgeBuild | ServerBuild;

export function targetBuildFor(project: Project): Build {
    const { target } = project.config;
    if (target.kind === 'edge') return new EdgeBuild(project, target);
    return new ServerBuild(project, target.entry);
}
