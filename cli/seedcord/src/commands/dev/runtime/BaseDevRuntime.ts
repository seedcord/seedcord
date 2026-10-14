import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { HmrPlugin } from './HmrPlugin';
import { loadEntry } from './loadEntry';

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
    public abstract stopBot(): Promise<void>;

    public importModule<TModule = unknown>(path: string): Promise<TModule> {
        return this.require('importModule').modules.importModule<TModule>(path);
    }

    public loadEntry(): Promise<DevRuntimeLoadResult> {
        const { context, modules } = this.require('loadEntry');
        return loadEntry(modules, context);
    }

    public refreshCommands(shouldRefresh: boolean): void {
        this.require('refreshCommands').hmr.sendRefreshCommands(shouldRefresh);
    }

    public async dispose(): Promise<void> {
        const { started } = this;
        this.started = undefined;
        await started?.resources.disposeAsync();
    }

    protected markStarted(started: TStarted): void {
        this.started = started;
    }

    protected require(method: string): TStarted {
        if (!this.started) throw new SeedcordError(SeedcordErrorCode.CliDevRuntimeNotStarted, [method]);
        return this.started;
    }

    protected openHmr(context: DevRuntimeContext, environment: string, resources: AsyncDisposableStack): HmrPlugin {
        const hmr = new HmrPlugin(context.config, environment);
        hmr.on('event', (event) => this.emit(context, event));
        // a restart builds a new runtime in the same process
        resources.defer(() => {
            hmr.removeAllListeners('event');
        });
        return hmr;
    }

    protected emit({ onEvent }: DevRuntimeContext, event: DevEvent): void {
        onEvent?.(event);
    }
}
