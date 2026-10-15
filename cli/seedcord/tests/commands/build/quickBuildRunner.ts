import { targetBuildFor } from '#commands/build/builder/targetBuildFor';
import { TypeChecker } from '#commands/build/builder/TypeChecker';
import { BuildRunner } from '#commands/build/BuildRunner';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { quietSteps } from '#core/output/quietSteps';

import type { Build } from '#commands/build/builder/targetBuildFor';
import type { Project } from '#core/project/Project';

// tsc costs about a second per build. build-type-error and build-http keep the real check
export class SkippedTypeCheck extends TypeChecker {
    public override check(project: Project): Promise<{ tsconfig: string }> {
        return Promise.resolve({ tsconfig: project.tsconfig() ?? '' });
    }
}

export function quickBuildRunner(buildFor: (project: Project) => Build = targetBuildFor): BuildRunner {
    return new BuildRunner({
        steps: quietSteps,
        projectLoader: new ProjectLoader(openModuleLoader),
        typeChecker: new SkippedTypeCheck(),
        buildFor
    });
}
