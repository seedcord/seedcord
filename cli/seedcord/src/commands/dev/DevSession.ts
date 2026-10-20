import { dirname } from 'node:path';

import { readBotToken } from '@seedcord/core/internal';
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
import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { DevLock } from '#core/state/DevLock';
import type { StateFolder } from '#core/state/StateFolder';
import type { DevStore } from '#ui/stores/DevStore';
import type { DevRuntime } from './runtime/DevRuntime';
import type { DevEventHandler } from './runtime/events';
import type { ILogger } from '@seedcord/types';

// gonna wait up to 5s otherwise a command import could block quitting forever
const TYPE_WRITE_STOP_MS = 5000;

export interface DevSessionDeps {
    readonly store: DevStore;
    readonly codegen: Pick<CodegenRunner, 'writeFrom'>;
    readonly codegenLogger: ILogger;
    readonly state: StateFolder;
    readonly lock: DevLock;
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
        private readonly files: ProjectFiles,
        private readonly runtime: DevRuntime,
        private readonly deps: DevSessionDeps
    ) {}

    private get isStopped(): boolean {
        return this.stopping.signal.aborted;
    }

    private async startRuntime(): Promise<void> {
        await this.runtime.start({
            config: this.config,
            files: this.files,
            state: this.deps.state,
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
            await this.run(onReady);
        } catch (error: unknown) {
            if (!signal.aborted) throw error;
        }
    }

    private unlessStopped<ResultT>(work: ResultT | PromiseLike<ResultT>): Promise<ResultT> {
        return unlessAborted(Promise.resolve(work), this.stopping.signal);
    }

    private async run(onReady?: () => void): Promise<void> {
        const { store } = this.deps;
        await this.unlessStopped(this.startRuntime());
        // vite never settles an import it was closed under
        const { module } = await this.unlessStopped(this.runtime.loadEntry());
        profileMark('entry');
        const exported = await this.unlessStopped(resolveDefaultExport(module));
        const instance = toSeedcordInstance(exported, this.config.instance);
        this.deps.lock.hold(readBotToken().applicationId, dirname(this.config.configFile));

        this.instance = instance;
        store.setTransport({
            name: instance[HostAugmentTarget],
            version: instance[HostVersion],
            target: this.config.target.kind
        });
        store.setPhase('starting');
        store.setStatus('Starting the bot…');
        const username = await this.unlessStopped(this.startBot(instance));

        store.setPhase('running');
        store.setStatus(`${paint.bold(username ?? 'Bot')} is ready!`);
        profileMark('ready');
        onReady?.();
        this.writeTypes();
        // tsc slows vite's first transform if it starts any earlier
        this.startTypecheck();
        // the bot runs until stop()
        await this.unlessStopped(new Promise<never>(() => undefined));
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
        const tscStopped = this.tscRunner?.stop();
        try {
            await this.typeWriteSettled();
            await this.runtime.stop();
        } finally {
            await tscStopped;
        }
    }

    // the pending type write imports through this runtime
    private async typeWriteSettled(): Promise<void> {
        if (!this.typeWrite) return;
        const { promise: timedOut, resolve } = Promise.withResolvers<undefined>();
        const timer = setTimeout(() => resolve(undefined), TYPE_WRITE_STOP_MS);
        await Promise.race([this.typeWrite, timedOut]);
        clearTimeout(timer);
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
                files: this.files,
                instance,
                modules: this.runtime
            });
            if (changed) codegenLogger.info(`Augmentations written to ${paint.path(outputPath)}`);
        } catch (error: unknown) {
            // the dev session keeps running when codegen throws
            codegenLogger.error('Could not update the command types', error);
        }

        if (!this.hasQueuedWrite || this.isStopped) return;
        this.hasQueuedWrite = false;
        await this.writeUntilCurrent(instance);
    }
}
