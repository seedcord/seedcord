import { existsSync } from 'node:fs';

import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { ProjectLoader } from '#core/config/ProjectLoader';
import { importInstance } from '#core/modules/importInstance';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { printResolvedConfig } from '#core/output/printResolvedConfig';

import { assertFoldersUnderRoot } from './builder/assertFoldersUnderRoot';
import { assertOutDirSafe } from './builder/assertOutDirSafe';
import { ServerBuilder } from './builder/ServerBuilder';
import { TypeChecker } from './builder/TypeChecker';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';
import type { Steps } from '#core/output/Steps';
import type { Project } from '#core/project/Project';
import type { BundleStats } from './builder/ServerBuilder';

export const BUILD_STEPS = ['read config', 'load bot', 'type check', 'bundle'] as const;
export type BuildStep = (typeof BUILD_STEPS)[number];

export interface BuildResult {
    config: ResolvedSeedcordDevConfig;
    bundle: BundleStats;
}

interface BuildRunnerDeps {
    readonly steps: Steps<BuildStep>;
    readonly projectLoader: ProjectLoader;
    readonly typeChecker: TypeChecker;
    readonly bundler: ServerBuilder;
}

export class BuildRunner {
    constructor(private readonly deps: BuildRunnerDeps) {}

    public static create(steps: Steps<BuildStep>): BuildRunner {
        return new BuildRunner({
            steps,
            projectLoader: new ProjectLoader(openModuleLoader),
            typeChecker: new TypeChecker(),
            bundler: new ServerBuilder()
        });
    }

    public async run(projectDir = process.cwd()): Promise<BuildResult> {
        const { steps, typeChecker, bundler } = this.deps;

        await using project = await steps.step('read config', () => this.loadProject(projectDir));
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
        const entry = config.target.kind === 'server' ? config.target.entry : config.instance;
        const bundle = await steps.step('bundle', () => bundler.build(project, entry));

        return { config, bundle };
    }

    private async loadProject(projectDir: string): Promise<Project> {
        await using onFailure = new AsyncDisposableStack();
        const project = onFailure.use(await this.deps.projectLoader.open(projectDir));
        const { target } = project.config;
        if (target.kind === 'server') this.assertEntryExists(target.entry);
        assertOutDirSafe(project.config.build.outDir, project.config.root);

        onFailure.move();
        return project;
    }

    private assertEntryExists(entryPath: string): void {
        if (!existsSync(entryPath)) {
            throw new SeedcordError(SeedcordErrorCode.CliEntryNotFound, [entryPath]);
        }
    }
}
