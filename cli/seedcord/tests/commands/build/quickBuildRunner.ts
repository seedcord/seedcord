import { targetBuildFor } from '#commands/build/builder/targetBuildFor';
import { TypeChecker } from '#commands/build/builder/TypeChecker';
import { BuildRunner } from '#commands/build/BuildRunner';
import { quietSteps } from '#core/output/quietSteps';

import type { Build } from '#commands/build/builder/targetBuildFor';
import type { runProjectTsc } from '#core/modules/runProjectTsc';
import type { Project } from '#core/project/Project';

// tsc costs about a second per build
const passingTsc: typeof runProjectTsc = () => Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });

export function quickBuildRunner(buildFor: (project: Project) => Build = targetBuildFor): BuildRunner {
    return new BuildRunner({
        steps: quietSteps,
        projectLoader: BuildRunner.projectLoader(),
        typeChecker: new TypeChecker(passingTsc),
        buildFor
    });
}
