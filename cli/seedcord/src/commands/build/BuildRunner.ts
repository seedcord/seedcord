import { existsSync } from 'node:fs';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { ConfigLoader } from '#core/config/ConfigLoader';
import { ConfigLocator } from '#core/config/ConfigLocator';
import { importInstance } from '#core/modules/importInstance';
import { RuntimeModuleLoader } from '#core/modules/RuntimeModuleLoader';

import { assertFoldersUnderRoot } from './builder/assertFoldersUnderRoot';
import { TypeChecker } from './builder/TypeChecker';
import { ViteBuilder } from './builder/ViteBuilder';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { ILogger } from '@seedcord/types';

export class BuildRunner {
    constructor(
        private readonly locator: ConfigLocator,
        private readonly configLoader: ConfigLoader,
        private readonly modules: ModuleLoader,
        private readonly typeChecker: TypeChecker,
        private readonly bundler: ViteBuilder
    ) {}

    public static create(logger: ILogger): BuildRunner {
        const modules = new RuntimeModuleLoader();

        return new BuildRunner(
            new ConfigLocator(logger),
            new ConfigLoader(modules, logger),
            modules,
            new TypeChecker(logger),
            new ViteBuilder(logger)
        );
    }

    public async run(projectDir = process.cwd()): Promise<void> {
        const config = await this.loadConfig(projectDir);
        this.assertEntryExists(config.entry);
        const instance = await importInstance(this.modules, config.instance);
        assertFoldersUnderRoot(instance.config, config.root);
        await this.typeChecker.check(config);
        await this.bundler.build(config);
    }

    private async loadConfig(projectDir: string): Promise<ResolvedSeedcordDevConfig> {
        return this.configLoader.load(this.locator.locate(projectDir));
    }

    private assertEntryExists(entryPath: string): void {
        if (!existsSync(entryPath)) {
            throw new SeedcordError(SeedcordErrorCode.CliEntryNotFound, [entryPath]);
        }
    }
}
