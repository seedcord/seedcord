import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { setBotRoot } from '@seedcord/utils/node/internal';

import { HmrPlugin } from './HmrPlugin';

import type { RunnerModuleLoader } from '#core/modules/RunnerModuleLoader';
import type { DevRuntime, DevRuntimeContext, DevRuntimeLoadResult } from './DevRuntime';
import type { DevEvent } from './events';
import type { SeedcordInstance } from '@seedcord/types/internal';

export interface StartedRuntime {
    readonly context: DevRuntimeContext;
    readonly modules: RunnerModuleLoader;
    readonly hmr: HmrPlugin;
    readonly resources: AsyncDisposableStack;
}

export abstract class BaseDevRuntime<TStarted extends StartedRuntime = StartedRuntime> implements DevRuntime {
    private started?: TStarted | undefined;

    public abstract start(context: DevRuntimeContext): Promise<void>;
    public abstract startBot(instance: SeedcordInstance): Promise<string | undefined>;
    protected abstract stopInstance(): Promise<void>;

    public importModule<TModule = unknown>(path: string): Promise<TModule> {
        return this.require('importModule').modules.importModule<TModule>(path);
    }

    public async loadEntry(): Promise<DevRuntimeLoadResult> {
        const { context, modules } = this.require('loadEntry');
        const { instance } = context.config;
        this.emit(context, { type: 'module-loading', path: instance });
        try {
            const module = await modules.importModule(instance);
            this.emit(context, { type: 'module-loaded', path: instance });
            return { module };
        } catch (error: unknown) {
            this.emit(context, { type: 'module-error', path: instance, error });
            throw error;
        }
    }

    public refreshCommands(shouldRefresh: boolean): void {
        this.require('refreshCommands').hmr.sendRefreshCommands(shouldRefresh);
    }

    public async stopBot(): Promise<void> {
        await this.stopInstance();
        const { started } = this;
        this.started = undefined;
        await started?.resources.disposeAsync();
    }

    protected markStarted(started: TStarted): void {
        this.started = started;
    }

    protected require(method: string): TStarted {
        if (!this.started) throw new SeedcordError(SeedcordErrorCode.CliDevRuntimeNotRunning, [method]);
        return this.started;
    }

    protected bindBotRoot(root: string, resources: AsyncDisposableStack): void {
        setBotRoot(root);
        resources.defer(() => setBotRoot(undefined));
    }

    protected openHmr(
        context: DevRuntimeContext,
        environment: string,
        resources: AsyncDisposableStack,
        wranglerConfig?: string
    ): HmrPlugin {
        const hmr = new HmrPlugin(context.config, environment, wranglerConfig);
        hmr.on('event', (event) => this.emit(context, event));
        // a restart builds a new runtime in the same process
        resources.defer(() => hmr.close());
        return hmr;
    }

    protected emit({ onEvent }: DevRuntimeContext, event: DevEvent): void {
        onEvent?.(event);
    }
}
