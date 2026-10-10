import { paint } from '@seedcord/errors';

import { ProjectLoader } from '#core/config/ProjectLoader';
import { importInstance } from '#core/modules/importInstance';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { printResolvedConfig } from '#core/output/printResolvedConfig';

import { assertFoldersUnderRoot } from './builder/assertFoldersUnderRoot';
import { assertOutDirSafe } from './builder/assertOutDirSafe';
import { targetBuildFor } from './builder/targetBuildFor';
import { TypeChecker } from './builder/TypeChecker';

import type { Steps } from '#core/output/Steps';
import type { Project } from '#core/project/Project';
import type { BundleStats } from './builder/output';
import type { NextCommand, TargetBuild } from './builder/TargetBuild';

export const BUILD_STEPS = ['read config', 'load bot', 'type check', 'bundle', 'boot'] as const;
export type BuildStep = (typeof BUILD_STEPS)[number];

export interface BuildResult {
    bundle: BundleStats;
    nextCommands: NextCommand[];
}

interface BuildRunnerDeps {
    readonly steps: Steps<BuildStep>;
    readonly projectLoader: ProjectLoader;
    readonly typeChecker: TypeChecker;
    readonly buildFor: (project: Project) => TargetBuild;
}

export class BuildRunner {
    constructor(private readonly deps: BuildRunnerDeps) {}

    public static create(steps: Steps<BuildStep>): BuildRunner {
        return new BuildRunner({
            steps,
            projectLoader: new ProjectLoader(openModuleLoader),
            typeChecker: new TypeChecker(),
            buildFor: targetBuildFor
        });
    }

    public async run(projectDir = process.cwd()): Promise<BuildResult> {
        const { steps, typeChecker } = this.deps;

        await using build = await steps.step('read config', () => this.open(projectDir));
        const { project } = build;
        const { config, modules } = project;
        printResolvedConfig(steps, config);

        await steps.step('load bot', async () => {
            const instance = await importInstance(modules, config.instance);
            assertFoldersUnderRoot(instance.config, config.root);
        });
        await steps.step(
            'type check',
            () => typeChecker.check(project),
            ({ tsconfig }) => paint.path(tsconfig)
        );
        const bundle = await steps.step('bundle', () => build.bundle());
        const boot = build.boot?.bind(build);
        if (boot) await steps.step('boot', boot);

        return { bundle, nextCommands: build.nextCommands(bundle) };
    }

    private async open(projectDir: string): Promise<TargetBuild> {
        await using onFailure = new AsyncDisposableStack();
        const project = onFailure.use(await this.deps.projectLoader.open(projectDir));
        const build = this.deps.buildFor(project);
        build.check();
        assertOutDirSafe(project.config.build.outDir, project.config.root);

        onFailure.move();
        return build;
    }
}
