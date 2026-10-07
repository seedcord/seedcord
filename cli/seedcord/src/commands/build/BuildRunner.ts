import { existsSync } from 'node:fs';

import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { ConfigLoader } from '#core/config/ConfigLoader';
import { importInstance } from '#core/modules/importInstance';
import { RuntimeModuleLoader } from '#core/modules/RuntimeModuleLoader';
import { printResolvedConfig } from '#core/output/printResolvedConfig';

import { assertFoldersUnderRoot } from './builder/assertFoldersUnderRoot';
import { assertOutDirSafe } from './builder/assertOutDirSafe';
import { TypeChecker } from './builder/TypeChecker';
import { ViteBuilder } from './builder/ViteBuilder';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { Steps } from '#core/output/Steps';
import type { BundleStats } from './builder/ViteBuilder';

export const BUILD_STEPS = ['read config', 'load bot', 'type check', 'bundle'] as const;
export type BuildStep = (typeof BUILD_STEPS)[number];

export interface BuildResult {
    config: ResolvedSeedcordDevConfig;
    bundle: BundleStats;
}

interface BuildRunnerDeps {
    readonly steps: Steps<BuildStep>;
    readonly configLoader: ConfigLoader;
    readonly modules: ModuleLoader;
    readonly typeChecker: TypeChecker;
    readonly bundler: ViteBuilder;
}

export class BuildRunner {
    constructor(private readonly deps: BuildRunnerDeps) {}

    public static create(steps: Steps<BuildStep>): BuildRunner {
        const modules = new RuntimeModuleLoader();

        return new BuildRunner({
            steps,
            configLoader: new ConfigLoader(modules),
            modules,
            typeChecker: new TypeChecker(),
            bundler: new ViteBuilder()
        });
    }

    public async run(projectDir = process.cwd()): Promise<BuildResult> {
        const { steps, modules, typeChecker, bundler } = this.deps;

        const config = await steps.step('read config', () => this.loadConfig(projectDir));
        printResolvedConfig(steps, config);

        await steps.step('load bot', async () => {
            const instance = await importInstance(modules, config.instance);
            assertFoldersUnderRoot(instance.config, config.root);
        });
        await steps.step(
            'type check',
            () => typeChecker.check(config),
            ({ tsconfig }) => paint.path(tsconfig)
        );
        const bundle = await steps.step('bundle', () => bundler.build(config));

        return { config, bundle };
    }

    private async loadConfig(projectDir: string): Promise<ResolvedSeedcordDevConfig> {
        const config = await this.deps.configLoader.load(projectDir);
        this.assertEntryExists(config.entry);
        assertOutDirSafe(config.build.outDir, config.root);
        return config;
    }

    private assertEntryExists(entryPath: string): void {
        if (!existsSync(entryPath)) {
            throw new SeedcordError(SeedcordErrorCode.CliEntryNotFound, [entryPath]);
        }
    }
}
