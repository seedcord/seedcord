import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/services';
import { SeedcordError } from '@seedcord/services/internal';
import { SeedcordBrand, type Brandable } from '@seedcord/types/internal';

import { ConfigLoader } from '@core/config/ConfigLoader';
import { ConfigLocator } from '@core/config/ConfigLocator';
import { RuntimeModuleLoader } from '@core/modules/RuntimeModuleLoader';
import { resolveDefaultExport } from '@utils/resolveDefaultExport';

import { ViteDevRuntime } from './runtime/ViteDevRuntime';
import { TscRunner } from './TscRunner';

import type { DevRuntime } from './runtime/DevRuntime';
import type { ResolvedSeedcordDevConfig } from '@core/config/schema';
import type { ILogger, SeedcordInstance } from '@seedcord/types';
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

        // Detect a missing entry structurally; the resolved instance path is absolute. Relying on vite's
        // "Does the file exist" wording broke the moment that phrasing changed across a minor.
        if (!existsSync(this.config.instance)) {
            throw new SeedcordError(SeedcordErrorCode.CliEntryNotFound, [this.config.instance]);
        }

        try {
            const { module } = await this.runtime.loadEntry();
            return module;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
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
        this.store.setConfig(instance.config);

        try {
            this.store.setPhase('starting');
            this.store.setStatus('Starting Seedcord instance...');
            this.startupPromise = Promise.resolve(instance.start());
            await this.startupPromise;

            if (this.isStopped) {
                return;
            }

            this.store.setPhase('running');
            this.store.setStatus('Seedcord is running.');
            onReady?.();

            // Block until stop() is called (by a UI action or the single signal handler in DevCommand). The session
            // registers no process-signal handlers itself, so restarts never accumulate listeners.
            await new Promise<void>((resolve) => {
                this.stopResolve = resolve;
            });
        } catch (error: unknown) {
            const reason = error instanceof Error ? error.message : 'Unknown error';
            throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [this.config.instance, reason]);
        }
    }

    // quit()/restart()/disconnect() call stop(), and the run loop's finally calls dispose() -> stop() again;
    // memoize so the abort + shutdown sequence runs exactly once instead of double-shutting-down.
    public async stop(): Promise<void> {
        this.stopPromise ??= this.runStop();
        return this.stopPromise;
    }

    private async runStop(): Promise<void> {
        this.isStopped = true;
        this.tscRunner?.stop();
        this.instance?.startup.abort();

        if (this.startupPromise) {
            // stop() already triggered startup.abort(), so a rejection here is that abort, not a fresh failure (real
            // startup failures surface through start()'s own catch). Awaiting drains it so teardown stays ordered.
            try {
                await this.startupPromise;
            } catch {
                /* drained: see above */
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

    constructor(
        private readonly locator: ConfigLocator,
        private readonly configLoader: ConfigLoader,
        private readonly store: DevStore
    ) {}

    public static create(logger: ILogger, store: DevStore): DevRunner {
        const moduleLoader = new RuntimeModuleLoader();
        const locator = new ConfigLocator(logger);
        const configLoader = new ConfigLoader(moduleLoader, logger);

        return new DevRunner(locator, configLoader, store);
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
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- quit() flips shouldQuit during the awaited session; TS narrows it to false from the loop guard and can't see the async cross-method mutation
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
        this.store.setError(error instanceof Error ? error : new Error(String(error)));
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
        this.currentSession?.refreshCommands(shouldRefresh);
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
