import { dirname } from 'node:path';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { HostAugmentTarget, HostVersion, type SeedcordInstance } from '@seedcord/types/internal';
import { asError } from '@seedcord/utils/internal';

import { toSeedcordInstance } from '#core/modules/importInstance';
import { profileMark } from '#ui/profile';
import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import { TscRunner } from './TscRunner';

import type { LoadedBot } from '#commands/codegen/CodegenRunner';
import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { DevStore } from '#ui/stores/DevStore';
import type { DevRuntime } from './runtime/DevRuntime';
import type { DevEventHandler } from './runtime/events';

export class DevSession {
    private stopResolve?: () => void;
    private instance?: SeedcordInstance;
    private isStopped = false;
    private tscRunner?: TscRunner;
    private stopPromise?: Promise<void>;

    constructor(
        private readonly config: ResolvedSeedcordConfig,
        private readonly runtime: DevRuntime,
        private readonly store: DevStore,
        private readonly onEvent: DevEventHandler
    ) {}

    private async loadInstanceModule(): Promise<unknown> {
        await this.runtime.start({
            config: this.config,
            onEvent: (event) => {
                this.store.apply(event);
                this.onEvent(event);
            }
        });
        profileMark('vite');

        const { module } = await this.runtime.loadEntry();
        profileMark('entry');
        return module;
    }

    private startTypecheck(): void {
        const { typecheck } = this.config;
        if (!typecheck.enabled) return;

        this.tscRunner = new TscRunner(typecheck.tsconfig, dirname(this.config.configFile));
        this.tscRunner.start();
    }

    public async start(onReady?: () => void): Promise<void> {
        const module = await this.loadInstanceModule();
        const instance = toSeedcordInstance(await resolveDefaultExport(module), this.config.instance);
        // stop() before this point had no bot to shut down
        if (this.isStopped) return;

        this.instance = instance;
        this.store.setTransport({
            name: instance[HostAugmentTarget],
            version: instance[HostVersion],
            target: this.config.target.kind
        });

        try {
            this.store.setPhase('starting');
            this.store.setStatus('Starting the bot…');
            const username = await this.runtime.startBot(instance);

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- stop() flips isStopped during the awaited startup
            if (this.isStopped) {
                return;
            }

            this.store.setPhase('running');
            this.store.setStatus(`${paint.bold(username ?? 'Bot')} is ready!`);
            profileMark('ready');
            onReady?.();
            // tsc competes with vite's cold transform when it starts any earlier
            this.startTypecheck();

            // resolved by stop(), and no signal handlers here so restarts never accumulate listeners
            await new Promise<void>((resolve) => {
                this.stopResolve = resolve;
            });
        } catch (error: unknown) {
            throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [this.config.instance, asError(error).message]);
        }
    }

    // every way out of a session ends here
    public async stop(): Promise<void> {
        this.stopPromise ??= this.runStop();
        return this.stopPromise;
    }

    private async runStop(): Promise<void> {
        this.isStopped = true;
        this.tscRunner?.stop();
        await this.runtime.stopBot();
        this.stopResolve?.();
    }

    public refreshCommands(shouldRefresh: boolean): void {
        if (this.isStopped) return;
        this.runtime.refreshCommands(shouldRefresh);
    }

    public loadedBot(): LoadedBot | undefined {
        if (!this.instance || this.isStopped) return undefined;
        return { config: this.config, instance: this.instance, modules: this.runtime };
    }
}
