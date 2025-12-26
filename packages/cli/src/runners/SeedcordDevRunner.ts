import { SeedcordError, SeedcordErrorCode } from '@seedcord/services';

import { ConfigLoader } from '../config/ConfigLoader';
import { ConfigLocator } from '../config/ConfigLocator';
import { TsRuntime } from '../dev/runtime/TsRuntime';
import { ViteDevRuntime } from '../dev/runtime/ViteDevRuntime';
import { RuntimeModuleLoader } from '../modules/RuntimeModuleLoader';
import { resolveDefaultExport } from '../utils/resolveDefaultExport';

import type { ResolvedSeedcordDevConfig } from '../config/schema';
import type { DevRuntime } from '../dev/runtime/DevRuntime';
import type { ILogger } from '@seedcord/types';

type MaybePromise<TValue> = TValue | Promise<TValue>;

interface SeedcordLike {
    start: () => MaybePromise<unknown>;
}

class SeedcordDevSession {
    constructor(
        private readonly config: ResolvedSeedcordDevConfig,
        private readonly runtime: DevRuntime,
        private readonly logger: ILogger
    ) {}

    public async start(): Promise<void> {
        await this.runtime.start({ config: this.config });

        const { module } = await this.runtime.loadEntry();
        const exported = resolveDefaultExport(module);
        const instance = await Promise.resolve(exported);

        if (!this.isSeedcordLike(instance)) {
            throw new SeedcordError(SeedcordErrorCode.CliInstanceInvalid);
        }

        try {
            this.logger.info('Starting Seedcord instance...');
            await instance.start();
            this.logger.info('Seedcord is running.');
        } catch (error: unknown) {
            const reason = error instanceof Error ? error.message : 'Unknown error';
            throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [this.config.instance, reason]);
        }
    }

    public async dispose(): Promise<void> {
        await this.runtime.dispose();
    }

    private isSeedcordLike(candidate: unknown): candidate is SeedcordLike {
        return Boolean(candidate) && typeof (candidate as SeedcordLike).start === 'function';
    }
}

/**
 * Coordinates config discovery, loading, and starting a Seedcord instance.
 */
export class SeedcordDevRunner {
    constructor(
        private readonly locator: ConfigLocator,
        private readonly configLoader: ConfigLoader,
        private readonly logger: ILogger
    ) {}

    public static create(logger: ILogger): SeedcordDevRunner {
        const moduleLoader = new RuntimeModuleLoader();
        const locator = new ConfigLocator(logger);
        const configLoader = new ConfigLoader(moduleLoader, logger);

        return new SeedcordDevRunner(locator, configLoader, logger);
    }

    public async run(runtimeType: 'ts' | 'vite' = 'ts'): Promise<void> {
        const config = await this.loadConfig();

        const runtime = runtimeType === 'vite' ? new ViteDevRuntime() : new TsRuntime();
        const session = new SeedcordDevSession(config, runtime, this.logger);

        try {
            await session.start();
        } finally {
            await session.dispose();
        }
    }

    private async loadConfig(): Promise<ResolvedSeedcordDevConfig> {
        const configPath = this.locator.locate();
        return this.configLoader.load(configPath);
    }
}
