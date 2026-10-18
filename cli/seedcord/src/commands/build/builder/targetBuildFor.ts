import { EdgeBuild } from './EdgeBuild';
import { ServerBuild } from './ServerBuild';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { Project } from '#core/project/Project';
import type { TargetBuildClass, TargetsByKind } from './TargetBuild';

export type Build = EdgeBuild | ServerBuild;

type TargetKind = keyof TargetsByKind;

const TARGET_BUILDS: { [Kind in TargetKind]: TargetBuildClass<Kind, Build> } = {
    server: ServerBuild,
    edge: EdgeBuild
};

// TypeScript intersects the two check signatures when this lookup isn't generic
function classFor<Kind extends TargetKind>(kind: Kind): TargetBuildClass<Kind, Build> {
    return TARGET_BUILDS[kind];
}

export function checkBuildTarget(config: ResolvedSeedcordConfig): void {
    classFor(config.target.kind).check(config, config.target);
}

export function targetBuildFor(project: Project): Build {
    const { target } = project.config;
    return new (classFor(target.kind))(project, target);
}
