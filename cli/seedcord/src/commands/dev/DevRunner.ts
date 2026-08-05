import { settleWithin } from '@seedcord/core/node/internal';
import { Logger } from '@seedcord/logger';

import { CodegenRunner } from '@commands/codegen/CodegenRunner';
import { ConfigLoader } from '@core/config/ConfigLoader';
import { ConfigLocator } from '@core/config/ConfigLocator';
import { RuntimeModuleLoader } from '@core/modules/RuntimeModuleLoader';
import { resetChannelColors } from '@ui/channelColor';

import { DevSession } from './DevSession';
import { ViteDevRuntime } from './runtime/ViteDevRuntime';
import { createTunnelCoordinator, missingCloudflaredHint } from './tunnel/createTunnelCoordinator';

import type { DevEvent } from './runtime/events';
import type { TunnelCoordinator } from './tunnel/TunnelCoordinator';
import type { ResolvedSeedcordDevConfig } from '@core/config/schema';
import type { ILogger } from '@seedcord/types';
import type { DevStore } from '@ui/stores/DevStore';

const TUNNEL_TEARDOWN_MS = 3000;

export interface DevRunnerDeps {
    readonly locator: ConfigLocator;
    readonly configLoader: ConfigLoader;
    readonly store: DevStore;
    readonly codegen: CodegenRunner;
    readonly codegenLogger: ILogger;
    readonly tunnel: TunnelCoordinator | undefined;
    readonly tunnelLogger: ILogger;
}

/**
 * Coordinates config discovery, loading, and starting a Seedcord instance.
 */
export class DevRunner {
    private currentSession: DevSession | null = null;
    private signalResolve?: () => void;
    private shouldQuit = false;
    private isDisconnected = false;
    private isRunning = false;
    private isRegenerating = false;
    private warnedMissingTunnel = false;

    private readonly locator: ConfigLocator;
    private readonly configLoader: ConfigLoader;
    private readonly store: DevStore;
    private readonly codegen: CodegenRunner;
    private readonly codegenLogger: ILogger;
    private readonly tunnel: TunnelCoordinator | undefined;
    private readonly tunnelLogger: ILogger;

    constructor(deps: DevRunnerDeps) {
        this.locator = deps.locator;
        this.configLoader = deps.configLoader;
        this.store = deps.store;
        this.codegen = deps.codegen;
        this.codegenLogger = deps.codegenLogger;
        this.tunnel = deps.tunnel;
        this.tunnelLogger = deps.tunnelLogger;
    }

    public static create(logger: Logger, store: DevStore): DevRunner {
        const moduleLoader = new RuntimeModuleLoader();
        const codegenLogger = new Logger('Codegen', { channel: 'cli' });
        const tunnelLogger = new Logger('Tunnel', { channel: 'cli' });

        return new DevRunner({
            locator: new ConfigLocator(logger),
            configLoader: new ConfigLoader(moduleLoader, logger),
            store,
            codegen: CodegenRunner.create(codegenLogger),
            codegenLogger,
            tunnel: createTunnelCoordinator(tunnelLogger),
            tunnelLogger
        });
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
        this.currentSession = new DevSession(config, runtime, this.store, (event) => {
            this.routeToTunnel(config.tunnel, event);
        });

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
        this.store.setStatus('Press r to restart.');
        this.store.setBusy(false);
        await this.waitForSignal();
        this.store.setBusy(true);
    }

    public async quit(): Promise<void> {
        this.shouldQuit = true;
        this.store.setPhase('quitting');
        await this.currentSession?.stop();
        // the endpoint clear is a discord round trip, and process.exit follows this
        await settleWithin(this.tunnel?.stop() ?? Promise.resolve(), TUNNEL_TEARDOWN_MS);
        this.signalResolve?.();
    }

    // the http host is the only one that reports a port, so a gateway run never reaches the warn
    public routeToTunnel(enabled: boolean, event: DevEvent): void {
        if (event.type !== 'server-listening' || !enabled) return;

        if (!this.tunnel) {
            if (this.warnedMissingTunnel) return;
            this.warnedMissingTunnel = true;
            this.tunnelLogger.warn(missingCloudflaredHint(process.platform));
            return;
        }

        void this.tunnel.onPort(event.port);
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

    // an accepted refresh means command files changed, so regenerate the registry for tsc to pick up the new option types
    private async regenerateRegistry(): Promise<void> {
        if (this.isRegenerating) return;
        this.isRegenerating = true;
        try {
            await this.codegen.run(false);
        } catch (error: unknown) {
            // codegen throws, so log here and keep the dev session running
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
