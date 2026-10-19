import { targetBuildFor } from '#commands/build/builder/targetBuildFor';
import { TypeChecker } from '#commands/build/builder/TypeChecker';
import { BuildRunner } from '#commands/build/BuildRunner';
import { quietSteps } from '#core/output/quietSteps';
import { ShellMode } from '#core/viteMode';

import type { Build } from '#commands/build/builder/targetBuildFor';
import type { BuildStep } from '#commands/build/BuildRunner';
import type { runProjectTsc } from '#core/modules/runProjectTsc';
import type { Steps } from '#core/output/Steps';
import type { Project } from '#core/project/Project';

// tsc costs about a second per build
const passingTsc: typeof runProjectTsc = () => Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });

export function quickBuildRunner(
    buildFor: (project: Project) => Build = targetBuildFor,
    shell = new ShellMode(),
    steps: Steps<BuildStep> = quietSteps
): BuildRunner {
    return new BuildRunner({
        steps,
        projectLoader: BuildRunner.productionProjectLoader(shell),
        typeChecker: new TypeChecker(passingTsc),
        buildFor
    });
}
