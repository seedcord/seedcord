import { dirname } from 'node:path';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { HostAugmentTarget, HostVersion, type SeedcordInstance } from '@seedcord/types/internal';
import { asError } from '@seedcord/utils/internal';

import { toSeedcordInstance } from '#core/modules/importInstance';
import { profileMark } from '#ui/profile';
import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import { TscRunner } from './TscRunner';

import type { CodegenRunner } from '#commands/codegen/CodegenRunner';
import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { DevStore } from '#ui/stores/DevStore';
import type { DevRuntime } from './runtime/DevRuntime';
import type { DevEventHandler } from './runtime/events';
import type { ILogger } from '@seedcord/types';

export interface DevSessionDeps {
    readonly store: DevStore;
    readonly codegen: Pick<CodegenRunner, 'writeFrom'>;
    readonly codegenLogger: ILogger;
    readonly onEvent: DevEventHandler;
}

export class DevSession {
    private stopResolve?: () => void;
    private instance?: SeedcordInstance;
    private isStopped = false;
    private tscRunner?: TscRunner;
    private stopPromise?: Promise<void>;
    private typeWrite?: Promise<void> | undefined;
    private hasQueuedWrite = false;

    constructor(
        private readonly config: ResolvedSeedcordConfig,
        private readonly runtime: DevRuntime,
        private readonly deps: DevSessionDeps
    ) {}

    private async startRuntime(): Promise<void> {
        await this.runtime.start({
            config: this.config,
            onEvent: (event) => {
                this.deps.store.apply(event);
                this.deps.onEvent(event);
            }
        });
        profileMark('vite');
    }

    private startTypecheck(): void {
        const { typecheck } = this.config;
        if (!typecheck.enabled) return;

        this.tscRunner = new TscRunner(typecheck.tsconfig, dirname(this.config.configFile));
        this.tscRunner.start();
    }

    public async start(onReady?: () => void): Promise<void> {
        const { store } = this.deps;
        await this.startRuntime();
        // stop() closed the runtime as it finished starting
        if (this.isStopped) return;

        const { module } = await this.runtime.loadEntry();
        profileMark('entry');
        const instance = toSeedcordInstance(await resolveDefaultExport(module), this.config.instance);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- stop() flips isStopped while the entry loads
        if (this.isStopped) return;

        this.instance = instance;
        store.setTransport({
            name: instance[HostAugmentTarget],
            version: instance[HostVersion],
            target: this.config.target.kind
        });

        try {
            store.setPhase('starting');
            store.setStatus('Starting the bot…');
            const username = await this.runtime.startBot(instance);

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- stop() flips isStopped during the awaited startup
            if (this.isStopped) {
                return;
            }

            store.setPhase('running');
            store.setStatus(`${paint.bold(username ?? 'Bot')} is ready!`);
            profileMark('ready');
            onReady?.();
            this.writeTypes();
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

    public async stop(): Promise<void> {
        this.stopPromise ??= this.runStop();
        return this.stopPromise;
    }

    private async runStop(): Promise<void> {
        this.isStopped = true;
        this.tscRunner?.stop();
        // codegen imports through the runtime that stopBot closes
        await this.typeWrite;
        await this.runtime.stopBot();
        this.stopResolve?.();
    }

    public refreshCommands(shouldRefresh: boolean): void {
        if (this.isStopped) return;
        if (shouldRefresh) this.writeTypes();
        this.runtime.refreshCommands(shouldRefresh);
    }

    private writeTypes(): void {
        if (this.isStopped || !this.instance) return;
        if (this.typeWrite) {
            // the running scan may have read a command before this refresh changed it
            this.hasQueuedWrite = true;
            return;
        }
        this.typeWrite = this.writeUntilCurrent(this.instance).finally(() => {
            this.typeWrite = undefined;
        });
    }

    private async writeUntilCurrent(instance: SeedcordInstance): Promise<void> {
        const { codegen, codegenLogger } = this.deps;
        try {
            const { outputPath, changed } = await codegen.writeFrom({
                config: this.config,
                instance,
                modules: this.runtime
            });
            if (changed) codegenLogger.info(`Augmentations written to ${paint.path(outputPath)}`);
        } catch (error: unknown) {
            // a codegen throw must not take the dev session down
            codegenLogger.error('Could not update the command types', error);
        }

        if (!this.hasQueuedWrite || this.isStopped) return;
        this.hasQueuedWrite = false;
        await this.writeUntilCurrent(instance);
    }
}
