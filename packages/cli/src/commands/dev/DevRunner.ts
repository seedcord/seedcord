/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { dirname } from 'node:path';

import { SeedcordError, SeedcordErrorCode } from '@seedcord/services';
import { SeedcordBrand } from '@seedcord/utils';

import { ConfigLoader } from '@core/config/ConfigLoader';
import { ConfigLocator } from '@core/config/ConfigLocator';
import { RuntimeModuleLoader } from '@core/modules/RuntimeModuleLoader';
import { resolveDefaultExport } from '@utils/resolveDefaultExport';

import { ViteDevRuntime } from './runtime/ViteDevRuntime';
import { TscRunner } from './TscRunner';

import type { DevRuntime } from './runtime/DevRuntime';
import type { ResolvedSeedcordDevConfig } from '@core/config/schema';
import type { Config, ILogger } from '@seedcord/types';

type MaybePromise<TValue> = TValue | Promise<TValue>;

interface SeedcordLike {
    [SeedcordBrand]?: boolean;
    start: () => MaybePromise<unknown>;
    shutdown?: {
        run: (exitCode?: number, exitProcess?: boolean) => Promise<void>;
    };
    startup?: {
        abort: () => void;
    };
    config?: Config;
}

class SeedcordDevSession {
    private stopResolve?: () => void;
    private instance?: SeedcordLike;
    private isStopped = false;
    private startupPromise?: Promise<unknown>;
    private tscRunner?: TscRunner;

    constructor(
        private readonly config: ResolvedSeedcordDevConfig,
        private readonly runtime: DevRuntime,
        private readonly actions: DevRunnerActions
    ) {}

    private async loadInstanceModule(): Promise<unknown> {
        await this.runtime.start({
            config: this.config,
            onEvent: (event) => {
                if (event.type === 'restart-required') {
                    this.actions.setStatus('Restart required. Press r to restart.');
                    this.actions.setRestartRequired(true);
                } else if (event.type === 'command-update-prompt') {
                    this.actions.setCommandUpdatePrompt(event.file);
                }
            }
        });

        try {
            const { module } = await this.runtime.loadEntry();
            return module;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('Does the file exist')) {
                throw new SeedcordError(SeedcordErrorCode.CliEntryNotFound, [this.config.instance]);
            }
            throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [this.config.instance, message]);
        }
    }

    public async start(onReady?: () => void): Promise<void> {
        const cwd = dirname(this.config.configFile);
        this.tscRunner = new TscRunner(this.config.tsconfig, cwd);
        this.tscRunner.start();

        const module = await this.loadInstanceModule();
        const exported = resolveDefaultExport(module);
        const instance = await Promise.resolve(exported);

        if (!this.isSeedcordLike(instance)) {
            throw new SeedcordError(SeedcordErrorCode.CliInstanceInvalid);
        }

        this.instance = instance;

        if (this.instance.config) {
            this.actions.setConfig(this.instance.config);
        }

        try {
            this.actions.setStatus('Starting Seedcord instance...');
            this.startupPromise = Promise.resolve(instance.start());
            await this.startupPromise;

            if (this.isStopped) {
                return;
            }

            this.actions.setStatus('Seedcord is running.');
            onReady?.();

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
        this.tscRunner?.stop();
        if (this.instance?.startup) {
            this.instance.startup.abort();
        }

        if (this.startupPromise) {
            try {
                await this.startupPromise;
            } catch {
                // Ignore errors from aborted startup
            }
        }

        if (this.instance?.shutdown) {
            await this.instance.shutdown.run(0, false);
        }
        this.stopResolve?.();
    }

    public async dispose(): Promise<void> {
        await this.runtime.dispose();
    }

    public refreshCommands(): void {
        this.runtime.refreshCommands?.();
    }

    private isSeedcordLike(candidate: unknown): candidate is SeedcordLike {
        return Boolean(candidate) && (candidate as SeedcordLike)[SeedcordBrand] === true;
    }
}

export interface DevRunnerActions {
    setStatus: (status: string) => void;
    setError: (error: Error) => void;
    setBusy: (isBusy: boolean) => void;
    setConfig: (config: Config) => void;
    setRestartRequired: (required: boolean) => void;
    setCommandUpdatePrompt: (file: string | null) => void;
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
                    await this.handleDisconnected(actions);
                    if (this.shouldQuit) break;
                    continue;
                }

                await this.runSession(actions);

                if (this.shouldQuit) break;
            } catch (error: unknown) {
                if (this.shouldQuit) break;
                await this.handleError(actions, error);
                if (this.shouldQuit) break;
            }
        }
    }

    private async handleDisconnected(actions: DevRunnerActions): Promise<void> {
        actions.setStatus('Disconnected. Press r to restart.');
        actions.setBusy(false);
        await this.waitForSignal();
        actions.setBusy(true);
        if (!this.shouldQuit) {
            this.isDisconnected = false;
        }
    }

    private async runSession(actions: DevRunnerActions): Promise<void> {
        actions.setBusy(true);
        const config = await this.loadConfig();
        const runtime = new ViteDevRuntime();
        this.currentSession = new SeedcordDevSession(config, runtime, actions);

        try {
            await this.currentSession.start(() => actions.setBusy(false));
        } finally {
            actions.setBusy(true);
            await this.currentSession.dispose();
            this.currentSession = null;
        }
    }

    private async handleError(actions: DevRunnerActions, error: unknown): Promise<void> {
        if (error instanceof Error) {
            actions.setError(error);
        } else {
            actions.setError(new Error(String(error)));
        }

        actions.setStatus('Error occurred. Press r to restart.');
        actions.setBusy(false);
        await this.waitForSignal();
        actions.setBusy(true);
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

    public refreshCommands(): void {
        this.currentSession?.refreshCommands();
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
