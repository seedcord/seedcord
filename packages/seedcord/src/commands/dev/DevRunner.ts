import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { SeedcordBrand, type Brandable, type SeedcordInstance } from '@seedcord/types/internal';
import chalk from 'chalk';

import { CodegenRunner } from '@commands/codegen/CodegenRunner';
import { ConfigLoader } from '@core/config/ConfigLoader';
import { ConfigLocator } from '@core/config/ConfigLocator';
import { RuntimeModuleLoader } from '@core/modules/RuntimeModuleLoader';
import { resetChannelColors } from '@ui/channelColor';
import { resolveDefaultExport } from '@utils/resolveDefaultExport';

import { ViteDevRuntime } from './runtime/ViteDevRuntime';
import { TscRunner } from './TscRunner';

import type { DevRuntime } from './runtime/DevRuntime';
import type { ResolvedSeedcordDevConfig } from '@core/config/schema';
import type { ILogger } from '@seedcord/types';
import type { DevStore } from '@ui/stores/DevStore';

export function isSeedcordInstance(candidate: unknown): candidate is SeedcordInstance {
    return typeof candidate === 'object' && candidate !== null && (candidate as Brandable)[SeedcordBrand] === true;
}

class SeedcordDevSession {
    private stopResolve?: () => void;
    private instance?: SeedcordInstance;
    private isStopped = false;
    private startupPromise?: Promise<unknown>;
    private tscRunner?: TscRunner;
    private stopPromise?: Promise<void>;

    constructor(
        private readonly config: ResolvedSeedcordDevConfig,
        private readonly runtime: DevRuntime,
        private readonly store: DevStore
    ) {}

    private async loadInstanceModule(): Promise<unknown> {
        await this.runtime.start({
            config: this.config,
            onEvent: (event) => {
                this.store.apply(event);
            }
        });

        // vite's missing-entry message changed across a minor and broke detection, so check the path directly
        if (!existsSync(this.config.instance)) {
            throw new SeedcordError(SeedcordErrorCode.CliEntryNotFound, [this.config.instance]);
        }

        try {
            const { module } = await this.runtime.loadEntry();
            return module;
        } catch (error: unknown) {
            const message = Error.isError(error) ? error.message : String(error);
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

        if (!isSeedcordInstance(instance)) {
            throw new SeedcordError(SeedcordErrorCode.CliInstanceInvalid);
        }

        this.instance = instance;
        this.store.setFrameworkVersion(instance.version);

        try {
            this.store.setPhase('starting');
            this.store.setStatus('Starting Seedcord instance…');
            this.startupPromise = Promise.resolve(instance.start());
            await this.startupPromise;

            if (this.isStopped) {
                return;
            }

            this.store.setPhase('running');
            this.store.setStatus(`${chalk.bold(instance.username ?? 'Bot')} is ready!`);
            onReady?.();

            // resolved by stop(). no process-signal handlers here (DevCommand registers the single one), so restarts never accumulate listeners.
            await new Promise<void>((resolve) => {
                this.stopResolve = resolve;
            });
        } catch (error: unknown) {
            const reason = Error.isError(error) ? error.message : 'Unknown error';
            throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [this.config.instance, reason]);
        }
    }

    // quit/restart/disconnect and dispose() all call stop() so it should only run once
    public async stop(): Promise<void> {
        this.stopPromise ??= this.runStop();
        return this.stopPromise;
    }

    private async runStop(): Promise<void> {
        this.isStopped = true;
        this.tscRunner?.stop();
        this.instance?.startup.abort();

        if (this.startupPromise) {
            // startup.abort() was triggered above. await the rejection and suppress it to maintain shutdown order
            try {
                await this.startupPromise;
            } catch {
                /* suppressed */
            }
        }

        await this.instance?.shutdown.run(0, false);
        this.stopResolve?.();
    }

    public async dispose(): Promise<void> {
        await this.stop();
        await this.runtime.dispose();
    }

    public refreshCommands(shouldRefresh: boolean): void {
        this.runtime.refreshCommands?.(shouldRefresh);
    }
}

/**
 * Coordinates config discovery, loading, and starting a Seedcord instance.
 */
export class DevRunner {
    private currentSession: SeedcordDevSession | null = null;
    private signalResolve?: () => void;
    private shouldQuit = false;
    private isDisconnected = false;
    private isRunning = false;
    private isRegenerating = false;

    constructor(
        private readonly locator: ConfigLocator,
        private readonly configLoader: ConfigLoader,
        private readonly store: DevStore,
        private readonly codegen: CodegenRunner,
        private readonly codegenLogger: ILogger
    ) {}

    public static create(logger: Logger, store: DevStore): DevRunner {
        const moduleLoader = new RuntimeModuleLoader();
        const codegenLogger = new Logger('Codegen', { channel: 'cli' });
        const locator = new ConfigLocator(logger);
        const configLoader = new ConfigLoader(moduleLoader, logger);

        return new DevRunner(locator, configLoader, store, CodegenRunner.create(codegenLogger), codegenLogger);
    }

    public async run(): Promise<void> {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            while (!this.shouldQuit) {
                try {
                    if (this.isDisconnected) {
                        await this.handleDisconnected();
                        continue;
                    }

                    await this.runSession();
                } catch (error: unknown) {
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- quit() flips shouldQuit during the awaited session. TS narrows it to false from the loop guard and can't see the async cross-method mutation
                    if (this.shouldQuit) break;
                    await this.handleError(error);
                }
            }
        } finally {
            this.isRunning = false;
        }
    }

    private async handleDisconnected(): Promise<void> {
        this.store.setPhase('disconnected');
        this.store.setStatus('Disconnected. Press r to restart.');
        this.store.setBusy(false);
        await this.waitForSignal();
        this.store.setBusy(true);
        if (!this.shouldQuit) {
            this.isDisconnected = false;
        }
    }

    private async runSession(): Promise<void> {
        resetChannelColors();
        this.store.setPhase('starting');
        this.store.setBusy(true);
        const config = await this.loadConfig();
        const runtime = new ViteDevRuntime();
        this.currentSession = new SeedcordDevSession(config, runtime, this.store);

        try {
            await this.currentSession.start(() => {
                this.store.setBusy(false);
            });
        } finally {
            this.store.setBusy(true);
            await this.currentSession.dispose();
            this.currentSession = null;
        }
    }

    private async handleError(error: unknown): Promise<void> {
        this.store.setPhase('error');
        this.store.setError(Error.isError(error) ? error : new Error(String(error)));
        this.store.setStatus('Error occurred. Press r to restart.');
        this.store.setBusy(false);
        await this.waitForSignal();
        this.store.setBusy(true);
    }

    public async quit(): Promise<void> {
        this.shouldQuit = true;
        this.store.setPhase('quitting');
        await this.currentSession?.stop();
        this.signalResolve?.();
    }

    public async restart(): Promise<void> {
        this.isDisconnected = false;
        await this.currentSession?.stop();
        this.signalResolve?.();
    }

    public async disconnect(): Promise<void> {
        // Already parked in the disconnected wait, waking the signal here would fall through and start a
        // fresh session (i.e. behave like restart). No live session means nothing to disconnect.
        if (this.isDisconnected) return;
        this.isDisconnected = true;
        await this.currentSession?.stop();
        this.signalResolve?.();
    }

    public refreshCommands(shouldRefresh: boolean): void {
        if (shouldRefresh) void this.regenerateRegistry();
        this.currentSession?.refreshCommands(shouldRefresh);
    }

    // an accepted refresh means command files changed, regenerate the typed registry so tsc picks up the new option types
    private async regenerateRegistry(): Promise<void> {
        if (this.isRegenerating) return;
        this.isRegenerating = true;
        try {
            await this.codegen.run(false);
        } catch (error: unknown) {
            // codegen throws, log here and keep the dev session running
            this.codegenLogger.error('Command registry regeneration failed', error);
        } finally {
            this.isRegenerating = false;
        }
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
