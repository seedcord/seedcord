import { SeedcordError, SeedcordErrorCode } from '@seedcord/services';

import { SeedcordInstanceLoader } from './SeedcordInstanceLoader';
import { ConfigLoader } from '../config/ConfigLoader';
import { ConfigLocator } from '../config/ConfigLocator';
import { RuntimeModuleLoader } from '../modules/RuntimeModuleLoader';

import type { ResolvedSeedcordDevConfig } from '../config/schema';
import type { ILogger } from '@seedcord/types';

class SeedcordDevSession {
    constructor(
        private readonly config: ResolvedSeedcordDevConfig,
        private readonly instanceLoader: SeedcordInstanceLoader,
        private readonly logger: ILogger
    ) {}

    public async start(): Promise<void> {
        const instance = await this.instanceLoader.load(this.config.instance);

        try {
            this.logger.info('Starting Seedcord instance...');
            await instance.start();
            this.logger.info('Seedcord is running.');
        } catch (error: unknown) {
            const reason = error instanceof Error ? error.message : 'Unknown error';
            throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [this.config.instance, reason]);
        }
    }
}

/**
 * Coordinates config discovery, loading, and starting a Seedcord instance.
 */
export class SeedcordDevRunner {
    constructor(
        private readonly locator: ConfigLocator,
        private readonly configLoader: ConfigLoader,
        private readonly instanceLoader: SeedcordInstanceLoader,
        private readonly logger: ILogger
    ) {}

    public static create(logger: ILogger): SeedcordDevRunner {
        const moduleLoader = new RuntimeModuleLoader();
        const locator = new ConfigLocator(logger);
        const configLoader = new ConfigLoader(moduleLoader, logger);
        const instanceLoader = new SeedcordInstanceLoader(moduleLoader, logger);

        return new SeedcordDevRunner(locator, configLoader, instanceLoader, logger);
    }

    public async run(): Promise<void> {
        const config = await this.loadConfig();
        const session = new SeedcordDevSession(config, this.instanceLoader, this.logger);
        await session.start();
    }

    private async loadConfig(): Promise<ResolvedSeedcordDevConfig> {
        const configPath = this.locator.locate();
        return this.configLoader.load(configPath);
    }
}
