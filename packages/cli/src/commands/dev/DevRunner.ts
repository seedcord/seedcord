import { SeedcordError, SeedcordErrorCode } from '@seedcord/services';

import { ConfigLoader } from '@core/config/ConfigLoader';
import { ConfigLocator } from '@core/config/ConfigLocator';
import { RuntimeModuleLoader } from '@core/modules/RuntimeModuleLoader';
import { resolveDefaultExport } from '@utils/resolveDefaultExport';

import { ViteDevRuntime } from './runtime/ViteDevRuntime';

import type { DevRuntime } from './runtime/DevRuntime';
import type { ResolvedSeedcordDevConfig } from '@core/config/schema';
import type { ILogger } from '@seedcord/types';

type MaybePromise<TValue> = TValue | Promise<TValue>;

interface SeedcordLike {
    start: () => MaybePromise<unknown>;
}

class SeedcordDevSession {
    constructor(
        private readonly config: ResolvedSeedcordDevConfig,
        private readonly runtime: DevRuntime,
        // @ts-expect-error - logger is used in other methods if we revert to standard logging, keeping for interface consistency
        private readonly logger: ILogger,
        private readonly onStatus?: (status: string) => void
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
            this.onStatus?.('Starting Seedcord instance...');
            await instance.start();
            this.onStatus?.('Seedcord is running.');

            await new Promise<void>((resolve) => {
                const cleanup = (): void => {
                    process.off('SIGINT', cleanup);
                    process.off('SIGTERM', cleanup);
                    resolve();
                };
                process.on('SIGINT', cleanup);
                process.on('SIGTERM', cleanup);
            });
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
export class DevRunner {
    constructor(
        private readonly locator: ConfigLocator,
        private readonly configLoader: ConfigLoader,
        private readonly logger: ILogger
    ) {}

    public static create(logger: ILogger): DevRunner {
        const moduleLoader = new RuntimeModuleLoader();
        const locator = new ConfigLocator(logger);
        const configLoader = new ConfigLoader(moduleLoader, logger);

        return new DevRunner(locator, configLoader, logger);
    }

    public async run(onStatus?: (status: string) => void): Promise<void> {
        const config = await this.loadConfig();

        const runtime = new ViteDevRuntime();
        const session = new SeedcordDevSession(config, runtime, this.logger, onStatus);

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
