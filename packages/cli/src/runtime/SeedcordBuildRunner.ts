import { existsSync } from 'node:fs';

import { SeedcordError, SeedcordErrorCode } from '@seedcord/services';

import { BootstrapWriter } from '../builder/BootstrapWriter';
import { TypeScriptProjectBuilder } from '../builder/TypeScriptProjectBuilder';
import { ConfigLoader } from '../config/ConfigLoader';
import { ConfigLocator } from '../config/ConfigLocator';
import { RuntimeModuleLoader } from '../modules/RuntimeModuleLoader';

import type { ResolvedSeedcordDevConfig } from '../config/schema';
import type { ILogger } from '@seedcord/types';

export class SeedcordBuildRunner {
    constructor(
        private readonly locator: ConfigLocator,
        private readonly configLoader: ConfigLoader,
        private readonly builder: TypeScriptProjectBuilder,
        private readonly bootstrapWriter: BootstrapWriter,
        private readonly logger: ILogger
    ) {}

    public static create(logger: ILogger): SeedcordBuildRunner {
        const moduleLoader = new RuntimeModuleLoader();
        const locator = new ConfigLocator(logger);
        const configLoader = new ConfigLoader(moduleLoader, logger);
        const builder = new TypeScriptProjectBuilder(logger);
        const bootstrapWriter = new BootstrapWriter(logger);

        return new SeedcordBuildRunner(locator, configLoader, builder, bootstrapWriter, logger);
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
