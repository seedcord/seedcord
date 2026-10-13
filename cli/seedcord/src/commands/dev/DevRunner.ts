import { settleWithin } from '@seedcord/core/node/internal';
import { paint } from '@seedcord/errors';

import { CodegenRunner } from '#commands/codegen/CodegenRunner';
import { cliLogger } from '#core/cliLogger';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { quietSteps } from '#core/output/quietSteps';
import { resetChannelColors } from '#ui/channelColor';
import { profileMark } from '#ui/profile';

import { DevSession } from './DevSession';
import { ViteDevRuntime } from './runtime/ViteDevRuntime';
import { createTunnelCoordinator } from './tunnel/createTunnelCoordinator';
import { TunnelRouter } from './tunnel/TunnelRouter';

import type { ResolvedSeedcordConfig, ResolvedTunnel } from '#core/config/schema';
import type { DevStore } from '#ui/stores/DevStore';
import type { DevRuntime } from './runtime/DevRuntime';
import type { TunnelCoordinator } from './tunnel/TunnelCoordinator';
import type { ILogger } from '@seedcord/types';

const TUNNEL_TEARDOWN_MS = 3000;

export interface DevRunnerDeps {
    readonly projectLoader: Pick<ProjectLoader, 'open'>;
    readonly store: DevStore;
    readonly codegen: Pick<CodegenRunner, 'writeFrom'>;
    readonly codegenLogger: ILogger;
    readonly tunnel: TunnelRouter;
    readonly runtime: () => DevRuntime;
}

export class DevRunner {
    private currentSession: DevSession | null = null;
    private signalResolve?: () => void;
    private shouldQuit = false;
    private quitting?: Promise<void>;
    private isDisconnected = false;
    private hasPendingRestart = false;
    private isRunning = false;
    private isWritingTypes = false;
    private hasQueuedWrite = false;

    constructor(private readonly deps: DevRunnerDeps) {}

    public static create(store: DevStore): DevRunner {
        const codegenLogger = cliLogger('Codegen');
        const tunnelLogger = cliLogger('Tunnel');
        const makeCoordinator = (tunnel: ResolvedTunnel): TunnelCoordinator | undefined =>
            createTunnelCoordinator(tunnelLogger, (status) => store.setTunnel(status), tunnel);

        return new DevRunner({
            projectLoader: new ProjectLoader(openModuleLoader),
            store,
            codegen: CodegenRunner.create(quietSteps, codegenLogger),
            codegenLogger,
            tunnel: new TunnelRouter(makeCoordinator, tunnelLogger),
            runtime: () => new ViteDevRuntime()
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
        this.hasPendingRestart = false;
        const config = await this.readConfig();
        // a key pressed during the config load had no session to stop
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- restart() sets it during the awaited load
        if (this.shouldQuit || this.isDisconnected || this.hasPendingRestart) return;
        profileMark('config');
        this.deps.store.setIdleAnimation(config.idleAnimation);
        this.currentSession = new DevSession(config, this.deps.runtime(), this.deps.store, (event) => {
            void this.deps.tunnel.route(config.tunnel, event);
        });

        try {
            await this.currentSession.start(() => {
                this.deps.store.setBusy(false);
                void this.writeTypes();
            });
        } finally {
            this.deps.store.setBusy(true);
            await this.currentSession.dispose();
            this.currentSession = null;
        }
    }

    private async readConfig(): Promise<ResolvedSeedcordConfig> {
        await using project = await this.deps.projectLoader.open();
        return project.config;
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
        this.hasPendingRestart = true;
        await this.currentSession?.stop();
        this.signalResolve?.();
    }

    // the tunnel stays up because a disconnect is a short parked state the user leaves by pressing r
    public async disconnect(): Promise<void> {
        // waking the signal while already parked would fall through and start a fresh session
        if (this.isDisconnected) return;
        this.isDisconnected = true;
        await this.currentSession?.stop();
        this.signalResolve?.();
    }

    public refreshCommands(shouldRefresh: boolean): void {
        if (shouldRefresh) void this.writeTypes();
        this.currentSession?.refreshCommands(shouldRefresh);
    }

    private async writeTypes(): Promise<void> {
        const bot = this.currentSession?.loadedBot();
        if (!bot) return;
        if (this.isWritingTypes) {
            // the running scan may have read a command before this refresh changed it
            this.hasQueuedWrite = true;
            return;
        }
        this.isWritingTypes = true;
        try {
            const { outputPath, changed } = await this.deps.codegen.writeFrom(bot);
            if (changed) this.deps.codegenLogger.info(`Augmentations written to ${paint.path(outputPath)}`);
        } catch (error: unknown) {
            // a codegen throw must not take the dev session down
            this.deps.codegenLogger.error('Could not update the command types', error);
        } finally {
            this.isWritingTypes = false;
        }

        if (!this.hasQueuedWrite) {
            return;
        }

        this.hasQueuedWrite = false;
        await this.writeTypes();
    }

    private async waitForSignal(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.signalResolve = resolve;
        });
    }
}
