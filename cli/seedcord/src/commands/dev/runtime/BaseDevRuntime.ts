import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { setDevFiles } from '@seedcord/utils/internal';

import { instanceModule } from '#core/modules/importInstance';

import { HmrPlugin } from './HmrPlugin';
import { RestartFiles } from './RestartFiles';

import type { EvaluatedModule, ModuleLoader } from '#core/modules/ModuleLoader';
import type { DevRuntime, DevRuntimeContext, DevRuntimeLoadResult } from './DevRuntime';
import type { DevEvent } from './events';
import type { SeedcordInstance } from '@seedcord/types/internal';

export interface StartedRuntime {
    readonly context: DevRuntimeContext;
    readonly modules: ModuleLoader;
    readonly hmr: HmrPlugin;
    readonly resources: AsyncDisposableStack;
}

export abstract class BaseDevRuntime<TStarted extends StartedRuntime = StartedRuntime> implements DevRuntime {
    private starting?: Promise<TStarted>;
    private started?: TStarted | undefined;
    private stopping?: Promise<void>;

    public abstract startBot(instance: SeedcordInstance): Promise<string | undefined>;
    // every resource it creates goes on the stack it receives
    protected abstract open(context: DevRuntimeContext, resources: AsyncDisposableStack): Promise<TStarted>;
    protected abstract stopInstance(): Promise<void>;

    public async start(context: DevRuntimeContext): Promise<void> {
        this.starting = this.openWithCleanup(context);
        const started = await this.starting;
        if (!this.stopping) this.started = started;
    }

    private async openWithCleanup(context: DevRuntimeContext): Promise<TStarted> {
        const resources = new AsyncDisposableStack();
        try {
            resources.use(setDevFiles(context.files.layout.toJSON()));
            return await this.open(context, resources);
        } catch (error: unknown) {
            await resources.disposeAsync();
            throw error;
        }
    }

    public importModule<TModule = unknown>(path: string): Promise<TModule> {
        return this.require('importModule').modules.importModule<TModule>(path);
    }

    public importPackage(name: string): Promise<Record<string, unknown>> {
        return this.require('importPackage').modules.importPackage(name);
    }

    public evaluated(): readonly EvaluatedModule[] {
        return this.require('evaluated').modules.evaluated();
    }

    public async loadEntry(): Promise<DevRuntimeLoadResult> {
        const { context, modules } = this.require('loadEntry');
        return { module: await instanceModule(modules, context.config.instance) };
    }

    public refreshCommands(shouldRefresh: boolean): void {
        this.require('refreshCommands').hmr.sendRefreshCommands(shouldRefresh);
    }

    public stop(): Promise<void> {
        this.stopping ??= this.close();
        return this.stopping;
    }

    private async close(): Promise<void> {
        this.started = undefined;
        // a start that failed already closed what it opened and threw to its own caller
        const started = await this.starting?.catch(() => undefined);
        try {
            await this.stopInstance();
        } finally {
            await started?.resources.disposeAsync();
        }
    }

    protected require(method: keyof DevRuntime): TStarted {
        if (!this.started) throw new SeedcordError(SeedcordErrorCode.CliDevRuntimeNotRunning, [method]);
        return this.started;
    }

    protected openHmr(
        context: DevRuntimeContext,
        environment: string,
        resources: AsyncDisposableStack,
        targetRestartFiles: readonly string[] = []
    ): HmrPlugin {
        const restartFiles = new RestartFiles(context.config, context.files.layout, targetRestartFiles);
        const hmr = new HmrPlugin(context.config, context.state, environment, restartFiles);
        hmr.on('event', (event) => this.emit(context, event));
        // a restart builds a new runtime in the same process
        resources.defer(() => hmr.close());
        return hmr;
    }

    protected emit({ onEvent }: DevRuntimeContext, event: DevEvent): void {
        onEvent?.(event);
    }
}
