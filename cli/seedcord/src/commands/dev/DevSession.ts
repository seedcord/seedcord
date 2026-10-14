import { dirname } from 'node:path';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { HostAugmentTarget, HostVersion, type SeedcordInstance } from '@seedcord/types/internal';
import { asError, unlessAborted } from '@seedcord/utils/internal';

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
    private readonly stopping = new AbortController();
    private instance?: SeedcordInstance;
    private tscRunner?: TscRunner;
    private stopPromise?: Promise<void>;
    private typeWrite?: Promise<void> | undefined;
    private hasQueuedWrite = false;

    constructor(
        private readonly config: ResolvedSeedcordConfig,
        private readonly runtime: DevRuntime,
        private readonly deps: DevSessionDeps
    ) {}

    private get isStopped(): boolean {
        return this.stopping.signal.aborted;
    }

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

    // returns as soon as stop() begins. await stop() to know the runtime closed
    public async start(onReady?: () => void): Promise<void> {
        const { signal } = this.stopping;
        try {
            await this.run(signal, onReady);
        } catch (error: unknown) {
            if (!signal.aborted) throw error;
        }
    }

    private async run(signal: AbortSignal, onReady?: () => void): Promise<void> {
        const { store } = this.deps;
        await unlessAborted(this.startRuntime(), signal);
        // vite never settles an import it was closed under
        const { module } = await unlessAborted(this.runtime.loadEntry(), signal);
        profileMark('entry');
        const instance = toSeedcordInstance(await resolveDefaultExport(module), this.config.instance);

        this.instance = instance;
        store.setTransport({
            name: instance[HostAugmentTarget],
            version: instance[HostVersion],
            target: this.config.target.kind
        });
        store.setPhase('starting');
        store.setStatus('Starting the bot…');
        const username = await unlessAborted(this.startBot(instance), signal);

        store.setPhase('running');
        store.setStatus(`${paint.bold(username ?? 'Bot')} is ready!`);
        profileMark('ready');
        onReady?.();
        this.writeTypes();
        // tsc competes with vite's cold transform when it starts any earlier
        this.startTypecheck();
        // the bot runs until stop()
        await unlessAborted(new Promise<never>(() => undefined), signal);
    }

    private async startBot(instance: SeedcordInstance): Promise<string | undefined> {
        try {
            return await this.runtime.startBot(instance);
        } catch (error: unknown) {
            throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [this.config.instance, asError(error).message], {
                cause: error
            });
        }
    }

    public async stop(): Promise<void> {
        this.stopPromise ??= this.runStop();
        return this.stopPromise;
    }

    private async runStop(): Promise<void> {
        this.stopping.abort();
        this.tscRunner?.stop();
        // codegen imports through the runtime that stop closes
        await this.typeWrite;
        await this.runtime.stop();
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
