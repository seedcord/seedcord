import { existsSync } from 'node:fs';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { ConfigLoader } from '@core/config/ConfigLoader';
import { ConfigLocator } from '@core/config/ConfigLocator';
import { RuntimeModuleLoader } from '@core/modules/RuntimeModuleLoader';

import { BootstrapWriter } from './builder/BootstrapWriter';
import { TypeScriptProjectBuilder } from './builder/TypeScriptProjectBuilder';

import type { ResolvedSeedcordDevConfig } from '@core/config/schema';
import type { ILogger } from '@seedcord/types';

export class BuildRunner {
    constructor(
        private readonly locator: ConfigLocator,
        private readonly configLoader: ConfigLoader,
        private readonly builder: TypeScriptProjectBuilder,
        private readonly bootstrapWriter: BootstrapWriter,
        private readonly logger: ILogger
    ) {}

    public static create(logger: ILogger): BuildRunner {
        const moduleLoader = new RuntimeModuleLoader();
        const locator = new ConfigLocator(logger);
        const configLoader = new ConfigLoader(moduleLoader, logger);
        const builder = new TypeScriptProjectBuilder(logger);
        const bootstrapWriter = new BootstrapWriter(logger);

        return new BuildRunner(locator, configLoader, builder, bootstrapWriter, logger);
    }

    public async run(): Promise<void> {
        const config = await this.loadConfig();
        this.assertEntryExists(config.entry);
        const { emittedEntry } = await this.builder.build(config);
        await this.bootstrapWriter.write(config, emittedEntry);
        this.logger.info('Seedcord build finished successfully.');
    }

    private async loadConfig(): Promise<ResolvedSeedcordDevConfig> {
        const configPath = this.locator.locate();
        return this.configLoader.load(configPath);
    }

    private assertEntryExists(entryPath: string): void {
        if (!existsSync(entryPath)) {
            throw new SeedcordError(SeedcordErrorCode.CliEntryNotFound, [entryPath]);
        }
    }
}
