import { settleWithin } from '@seedcord/core/node/internal';
import { Logger } from '@seedcord/logger';

import { CodegenRunner } from '@commands/codegen/CodegenRunner';
import { ConfigLoader } from '@core/config/ConfigLoader';
import { ConfigLocator } from '@core/config/ConfigLocator';
import { RuntimeModuleLoader } from '@core/modules/RuntimeModuleLoader';
import { resetChannelColors } from '@ui/channelColor';

import { DevSession } from './DevSession';
import { ViteDevRuntime } from './runtime/ViteDevRuntime';
import { createTunnelCoordinator } from './tunnel/createTunnelCoordinator';
import { TunnelRouter } from './tunnel/TunnelRouter';

import type { TunnelCoordinator } from './tunnel/TunnelCoordinator';
import type { ResolvedSeedcordDevConfig, ResolvedTunnel } from '@core/config/schema';
import type { ILogger } from '@seedcord/types';
import type { DevStore } from '@ui/stores/DevStore';

const TUNNEL_TEARDOWN_MS = 3000;

export interface DevRunnerDeps {
    readonly locator: ConfigLocator;
    readonly configLoader: ConfigLoader;
    readonly store: DevStore;
    readonly codegen: CodegenRunner;
    readonly codegenLogger: ILogger;
    readonly tunnel: TunnelRouter;
}

export class DevRunner {
    private currentSession: DevSession | null = null;
    private signalResolve?: () => void;
    private shouldQuit = false;
    private quitting?: Promise<void>;
    private isDisconnected = false;
    private isRunning = false;
    private isRegenerating = false;

    constructor(private readonly deps: DevRunnerDeps) {}

    public static create(logger: Logger, store: DevStore): DevRunner {
        const moduleLoader = new RuntimeModuleLoader();
        const codegenLogger = new Logger('Codegen', { channel: 'cli' });
        const tunnelLogger = new Logger('Tunnel', { channel: 'cli' });
        const makeCoordinator = (tunnel: ResolvedTunnel): TunnelCoordinator | undefined =>
            createTunnelCoordinator(tunnelLogger, (url) => store.setTunnelUrl(url), tunnel);

        return new DevRunner({
            locator: new ConfigLocator(logger),
            configLoader: new ConfigLoader(moduleLoader, logger),
            store,
            codegen: CodegenRunner.create(codegenLogger),
            codegenLogger,
            tunnel: new TunnelRouter(makeCoordinator, tunnelLogger)
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
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- quit() flips shouldQuit during the awaited session, which TS cannot see from the loop guard
                    if (this.shouldQuit) break;
                    await this.handleError(error);
                }
            }
        } finally {
            this.isRunning = false;
            await this.quitting; // process.exit follows run() resolving
        }
    }

    private async handleDisconnected(): Promise<void> {
        this.deps.store.setPhase('disconnected');
        this.deps.store.setStatus('Disconnected. Press r to restart.');
        this.deps.store.setBusy(false);
        await this.waitForSignal();
        this.deps.store.setBusy(true);
        if (!this.shouldQuit) {
            this.isDisconnected = false;
        }
    }

    private async runSession(): Promise<void> {
        resetChannelColors();
        this.deps.store.setPhase('starting');
        this.deps.store.setBusy(true);
        const config = await this.loadConfig();
        const runtime = new ViteDevRuntime();
        this.currentSession = new DevSession(config, runtime, this.deps.store, (event) => {
            this.deps.tunnel.route(config.tunnel, event);
        });

        try {
            await this.currentSession.start(() => {
                this.deps.store.setBusy(false);
            });
        } finally {
            this.deps.store.setBusy(true);
            await this.currentSession.dispose();
            this.currentSession = null;
        }
    }

    private async handleError(error: unknown): Promise<void> {
        this.deps.store.setPhase('error');
        this.deps.store.setError(Error.isError(error) ? error : new Error(String(error)));
        this.deps.store.setStatus('Press r to restart.');
        this.deps.store.setBusy(false);
        await this.waitForSignal();
        this.deps.store.setBusy(true);
    }

    // every caller drops this promise, so run() awaits it
    public async quit(): Promise<void> {
        this.quitting ??= this.runQuit();
        return this.quitting;
    }

    private async runQuit(): Promise<void> {
        this.shouldQuit = true;
        this.deps.store.setPhase('quitting');
        await this.currentSession?.stop();
        // the endpoint clear is a discord round trip
        await settleWithin(this.deps.tunnel.stop(), TUNNEL_TEARDOWN_MS);
        this.signalResolve?.();
    }

    public async restart(): Promise<void> {
        this.isDisconnected = false;
        await this.currentSession?.stop();
        this.signalResolve?.();
    }

    // the tunnel stays up here because a disconnect is a short parked state the user presses r out of
    public async disconnect(): Promise<void> {
        // waking the signal while already parked would fall through and start a fresh session
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
            await this.deps.codegen.run(false);
        } catch (error: unknown) {
            // a codegen throw must not take the dev session down
            this.deps.codegenLogger.error('Command registry regeneration failed', error);
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
        const configPath = this.deps.locator.locate();
        return this.deps.configLoader.load(configPath);
    }
}
