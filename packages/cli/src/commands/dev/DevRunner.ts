/* eslint-disable @typescript-eslint/no-unnecessary-condition */
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
    shutdown?: {
        run: (exitCode?: number, exitProcess?: boolean) => Promise<void>;
    };
    startup?: {
        abort: () => void;
    };
}

class SeedcordDevSession {
    private stopResolve?: () => void;
    private instance?: SeedcordLike;
    private isStopped = false;

    constructor(
        private readonly config: ResolvedSeedcordDevConfig,
        private readonly runtime: DevRuntime,
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

        this.instance = instance;

        try {
            this.onStatus?.('Starting Seedcord instance...');
            await instance.start();
            this.onStatus?.('Seedcord is running.');

            if (this.isStopped) {
                return;
            }

            await new Promise<void>((resolve) => {
                const cleanup = (): void => {
                    process.off('SIGINT', cleanup);
                    process.off('SIGTERM', cleanup);
                    resolve();
                };
                this.stopResolve = cleanup;
                process.on('SIGINT', cleanup);
                process.on('SIGTERM', cleanup);
            });
        } catch (error: unknown) {
            const reason = error instanceof Error ? error.message : 'Unknown error';
            throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [this.config.instance, reason]);
        }
    }

    public async stop(): Promise<void> {
        this.isStopped = true;
        if (this.instance?.startup) {
            this.instance.startup.abort();
        }
        if (this.instance?.shutdown) {
            await this.instance.shutdown.run(0, false);
        }
        this.stopResolve?.();
    }

    public async dispose(): Promise<void> {
        await this.runtime.dispose();
    }

    private isSeedcordLike(candidate: unknown): candidate is SeedcordLike {
        return Boolean(candidate) && typeof (candidate as SeedcordLike).start === 'function';
    }
}

export interface DevRunnerActions {
    setStatus: (status: string) => void;
    setError: (error: Error) => void;
}

/**
 * Coordinates config discovery, loading, and starting a Seedcord instance.
 */
export class DevRunner {
    private currentSession: SeedcordDevSession | null = null;
    private signalResolve?: () => void;
    private shouldQuit = false;
    private isDisconnected = false;

    constructor(
        private readonly locator: ConfigLocator,
        private readonly configLoader: ConfigLoader
    ) {}

    public static create(logger: ILogger): DevRunner {
        const moduleLoader = new RuntimeModuleLoader();
        const locator = new ConfigLocator(logger);
        const configLoader = new ConfigLoader(moduleLoader, logger);

        return new DevRunner(locator, configLoader);
    }

    public async run(actions: DevRunnerActions): Promise<void> {
        while (true) {
            try {
                if (this.shouldQuit) break;

                if (this.isDisconnected) {
                    actions.setStatus('Disconnected. Press r to restart.');
                    await this.waitForSignal();
                    if (this.shouldQuit) break;
                    this.isDisconnected = false;
                    continue;
                }

                const config = await this.loadConfig();
                const runtime = new ViteDevRuntime();
                this.currentSession = new SeedcordDevSession(config, runtime, actions.setStatus);

                try {
                    await this.currentSession.start();
                } finally {
                    await this.currentSession.dispose();
                    this.currentSession = null;
                }

                if (this.shouldQuit) break;
                // If session ended naturally (e.g. internal stop), loop again (restart)
            } catch (error: unknown) {
                if (this.shouldQuit) break;

                if (error instanceof Error) {
                    actions.setError(error);
                } else {
                    actions.setError(new Error(String(error)));
                }

                actions.setStatus('Error occurred. Press r to restart.');
                await this.waitForSignal();
                if (this.shouldQuit) break;
            }
        }
    }

    public async quit(): Promise<void> {
        this.shouldQuit = true;
        await this.currentSession?.stop();
        this.signalResolve?.();
    }

    public async restart(): Promise<void> {
        this.isDisconnected = false;
        await this.currentSession?.stop();
        this.signalResolve?.();
    }

    public async disconnect(): Promise<void> {
        this.isDisconnected = true;
        await this.currentSession?.stop();
        this.signalResolve?.();
    }

    private async waitForSignal(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.signalResolve = resolve;
        });
    }

    public async loadConfig(): Promise<ResolvedSeedcordDevConfig> {
        const configPath = this.locator.locate();
        return this.configLoader.load(configPath);
    }
}
