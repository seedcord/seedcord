import { paint } from '@seedcord/errors';

import { openProjectWithSteps } from '#core/config/openProjectWithSteps';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { importInstance } from '#core/modules/importInstance';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { printResolvedConfig } from '#core/output/printResolvedConfig';
import { startupShell } from '#core/viteMode';

import { assertFoldersBundled } from './builder/assertFoldersBundled';
import { checkBuildTarget, targetBuildFor } from './builder/targetBuildFor';
import { TypeChecker } from './builder/TypeChecker';

import type { Steps } from '#core/output/Steps';
import type { Project } from '#core/project/Project';
import type { BundleStats } from './builder/output';
import type { NextCommand } from './builder/TargetBuild';
import type { Build } from './builder/targetBuildFor';
import type { BotConfig } from '@seedcord/types';

export const BUILD_STEPS = [
    'read config',
    'load plugins',
    'load bot',
    'type check',
    'read discord',
    'bundle',
    'write types',
    'boot'
] as const;
export type BuildStep = (typeof BUILD_STEPS)[number];

export interface BuildResult {
    bundle: BundleStats;
    nextCommands: NextCommand[];
}

interface BuildRunnerDeps {
    readonly steps: Steps<BuildStep>;
    readonly projectLoader: ProjectLoader;
    readonly typeChecker: TypeChecker;
    readonly buildFor: (project: Project) => Build;
}

export class BuildRunner {
    constructor(private readonly deps: BuildRunnerDeps) {}

    public static productionProjectLoader(shell = startupShell): ProjectLoader {
        return new ProjectLoader(openModuleLoader, shell, 'production');
    }

    public static create(steps: Steps<BuildStep>, shell = startupShell): BuildRunner {
        return new BuildRunner({
            steps,
            projectLoader: BuildRunner.productionProjectLoader(shell),
            typeChecker: new TypeChecker(),
            buildFor: targetBuildFor
        });
    }

    public async run(projectDir = process.cwd()): Promise<BuildResult> {
        const { steps, typeChecker } = this.deps;

        const opened = await openProjectWithSteps(steps, this.deps.projectLoader, {
            projectDir,
            check: checkBuildTarget
        });
        await using build = this.deps.buildFor(opened);
        const { project } = build;
        const { config, modules } = project;
        printResolvedConfig(steps, config);

        const instance = await steps.step('load bot', async () => {
            const loaded = await importInstance(modules, config.instance);
            assertFoldersBundled(loaded.config, project);
            return loaded;
        });
        await steps.step(
            'type check',
            () => typeChecker.check(project),
            ({ tsconfig }) => paint.path(tsconfig)
        );
        const bundle = await this.bundle(build, instance.config.bot);
        const writeTypes = build.writeTypes?.bind(build);
        if (writeTypes) await steps.step('write types', writeTypes);
        const boot = build.boot?.bind(build);
        if (boot) await steps.step('boot', boot);

        return { bundle, nextCommands: build.nextCommands(bundle) };
    }

    private async bundle(build: Build, bot: BotConfig): Promise<BundleStats> {
        const { steps } = this.deps;
        if (build.kind === 'server') return steps.step('bundle', () => build.bundle());

        const ids = await steps.step('read discord', () => build.readDiscord(bot));
        return steps.step('bundle', () => build.bundle(ids));
    }
}
