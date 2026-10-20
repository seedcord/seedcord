import { settleWithin } from '@seedcord/core/node/internal';

import { CodegenRunner } from '#commands/codegen/CodegenRunner';
import { cliLogger } from '#core/cliLogger';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { quietSteps } from '#core/output/quietSteps';
import { DevLock } from '#core/state/DevLock';
import { startupShell } from '#core/viteMode';
import { resetChannelColors } from '#ui/channelColor';
import { profileMark } from '#ui/profile';

import { DevSession } from './DevSession';
import { EdgeDevRuntime } from './runtime/EdgeDevRuntime';
import { ServerDevRuntime } from './runtime/ServerDevRuntime';
import { createTunnelCoordinator } from './tunnel/createTunnelCoordinator';
import { TunnelRouter } from './tunnel/TunnelRouter';

import type { ResolvedTarget, ResolvedTunnel } from '#core/config/schema';
import type { StateFolder } from '#core/state/StateFolder';
import type { DevStore } from '#ui/stores/DevStore';
import type { DevSessionDeps } from './DevSession';
import type { DevRuntime } from './runtime/DevRuntime';
import type { TunnelCoordinator } from './tunnel/TunnelCoordinator';
import type { TypedOmit } from '@seedcord/types';

const TUNNEL_TEARDOWN_MS = 3000;

export interface DevRunnerDeps extends TypedOmit<DevSessionDeps, 'onEvent'> {
    readonly projectLoader: Pick<ProjectLoader, 'readConfig'>;
    readonly tunnel: TunnelRouter;
    readonly runtime: (target: ResolvedTarget) => DevRuntime;
}

type NextStep = 'session' | 'disconnected' | 'quit';

export class DevRunner {
    private currentSession: DevSession | null = null;
    private signalResolve?: () => void;
    private next: NextStep = 'session';
    private restarts = 0;
    private quitting?: Promise<void>;

    constructor(private readonly deps: DevRunnerDeps) {}

    public static create(store: DevStore, state: StateFolder): DevRunner {
        const codegenLogger = cliLogger('Codegen');
        const tunnelLogger = cliLogger('Tunnel');
        const makeCoordinator = (tunnel: ResolvedTunnel): TunnelCoordinator | undefined =>
            createTunnelCoordinator(tunnelLogger, (status) => store.setTunnel(status), tunnel);

        return new DevRunner({
            projectLoader: new ProjectLoader(openModuleLoader, startupShell),
            store,
            state,
            lock: DevLock.create(cliLogger('Dev')),
            codegen: CodegenRunner.create(quietSteps, codegenLogger),
            codegenLogger,
            tunnel: new TunnelRouter(makeCoordinator, tunnelLogger),
            runtime: (target) => (target.kind === 'edge' ? new EdgeDevRuntime(target) : new ServerDevRuntime())
        });
    }

    public async run(): Promise<void> {
        try {
            while (this.next !== 'quit') {
                try {
                    if (this.next === 'disconnected') {
                        await this.parkDisconnected();
                        continue;
                    }

                    await this.runSession();
                } catch (error: unknown) {
                    if (this.quitting) break;
                    await this.parkError(error);
                }
            }
        } finally {
            await this.quitting; // process.exit follows run() resolving
        }
    }

    private async parkDisconnected(): Promise<void> {
        const { store } = this.deps;
        store.setPhase('disconnected');
        store.setStatus('Disconnected. Press r to restart.');
        store.setBusy(false);
        await this.waitForSignal();
        store.setBusy(true);
    }

    private async parkError(error: unknown): Promise<void> {
        const { store } = this.deps;
        store.setPhase('error');
        store.setError(Error.isError(error) ? error : new Error(String(error)));
        store.setStatus('Press r to restart.');
        store.setBusy(false);
        await this.waitForSignal();
        store.setBusy(true);
    }

    private async runSession(): Promise<void> {
        const { store, tunnel } = this.deps;
        resetChannelColors();
        store.setPhase('starting');
        store.setBusy(true);
        const restarts = this.restarts;
        await using loaded = await this.deps.projectLoader.readConfig();
        const { config, files } = loaded;
        // a key pressed during the config load had no session to stop
        if (this.next !== 'session' || this.restarts !== restarts) return;
        profileMark('config');
        store.setIdleAnimation(config.idleAnimation);
        this.currentSession = new DevSession(config, files, this.deps.runtime(config.target), {
            ...this.deps,
            onEvent: (event) => void tunnel.route(config.tunnel, event)
        });

        try {
            await this.currentSession.start(() => store.setBusy(false));
        } finally {
            store.setBusy(true);
            await this.currentSession.stop();
            this.currentSession = null;
        }
    }

    // every caller drops this promise, so run() awaits it
    public async quit(): Promise<void> {
        this.quitting ??= this.runQuit();
        return this.quitting;
    }

    private async runQuit(): Promise<void> {
        this.next = 'quit';
        this.deps.store.setPhase('quitting');
        await this.currentSession?.stop();
        // release after the clear, or the clear can wipe the endpoint the next session just set
        const endpointCleared = this.deps.tunnel.stop().finally(() => this.deps.lock.release());
        // the endpoint clear is a discord round trip
        await settleWithin(endpointCleared, TUNNEL_TEARDOWN_MS);
        this.signalResolve?.();
    }

    public async restart(): Promise<void> {
        if (this.next === 'quit') return;
        this.next = 'session';
        this.restarts++;
        await this.currentSession?.stop();
        this.signalResolve?.();
    }

    // the tunnel stays up because a disconnect is a short parked state the user leaves by pressing r
    public async disconnect(): Promise<void> {
        // waking the signal while already parked would fall through and start a fresh session
        if (this.next !== 'session') return;
        this.next = 'disconnected';
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
}
