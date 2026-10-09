import { EdgeBuild } from './EdgeBuild';
import { ServerBuild } from './ServerBuild';

import type { Project } from '#core/project/Project';
import type { TargetBuild } from './TargetBuild';

export function targetBuildFor(project: Project): TargetBuild {
    const { target } = project.config;
    if (target.kind === 'edge') return new EdgeBuild(project, target);
    return new ServerBuild(project, target.entry);
}
