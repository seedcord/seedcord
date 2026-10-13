import { dirname } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { setBotRoot } from '@seedcord/utils/node/internal';
import { createServer, createServerModuleRunner } from 'vite';

import { RunnerModuleLoader } from '#core/modules/RunnerModuleLoader';
import { seedcordDependents } from '#core/modules/seedcordDependents';
import { mergeViteConfig } from '#core/modules/userCodeConfig';

import { devServerConfig, logsIgnore } from './devServerConfig';
import { HmrPlugin } from './HmrPlugin';
import { InstanceLifecycle } from './InstanceLifecycle';
import { loadEntry } from './loadEntry';

import type { DevRuntime, DevRuntimeContext, DevRuntimeLoadResult } from './DevRuntime';
import type { DevEvent } from './events';
import type { SeedcordInstance } from '@seedcord/types/internal';

interface Started {
    readonly context: DevRuntimeContext;
    readonly modules: RunnerModuleLoader;
    readonly hmr: HmrPlugin;
    readonly resources: AsyncDisposableStack;
}

export class ServerDevRuntime implements DevRuntime {
    private started?: Started | undefined;
    private readonly lifecycle = new InstanceLifecycle();

    public async start(context: DevRuntimeContext): Promise<void> {
        const { root, configFile } = context.config;
        await using onFailure = new AsyncDisposableStack();
        setBotRoot(root);
        onFailure.defer(() => setBotRoot(undefined));
        this.emit(context, { type: 'module-loading', path: root });

        const hmr = new HmrPlugin(context.config, 'ssr');
        hmr.on('event', (event) => this.emit(context, event));
        // a restart builds a new runtime in the same process
        onFailure.defer(() => {
            hmr.removeAllListeners('event');
        });

        // vite writes resolved options back into the config object it receives
        const base = structuredClone(devServerConfig);

        // vite searches its own root for a config file
        const config = mergeViteConfig(base, {
            root,
            configFile: false,
            server: { watch: { ignored: [logsIgnore(process.cwd())] } },
            // an external plugin would load node's copy of @seedcord/core beside vite's
            ssr: { noExternal: seedcordDependents(dirname(configFile)) },
            plugins: [hmr.plugin]
        });

        const server = await createServer(config);
        onFailure.defer(() => server.close());
        const modules = new RunnerModuleLoader(createServerModuleRunner(server.environments.ssr));
        this.started = { context, modules, hmr, resources: onFailure.move() };

        this.emit(context, { type: 'module-loaded', path: root });
        this.emit(context, { type: 'ready' });
    }

    public startBot(instance: SeedcordInstance): Promise<string | undefined> {
        return this.lifecycle.start(instance);
    }

    public stopBot(): Promise<void> {
        return this.lifecycle.stop();
    }

    public refreshCommands(shouldRefresh: boolean): void {
        this.require().hmr.sendRefreshCommands(shouldRefresh);
    }

    public async importModule<TModule = unknown>(path: string): Promise<TModule> {
        return this.require().modules.importModule<TModule>(path);
    }

    public loadEntry(): Promise<DevRuntimeLoadResult> {
        const { context, modules } = this.require();
        return loadEntry(modules, context);
    }

    public async dispose(): Promise<void> {
        const { started } = this;
        this.started = undefined;
        await started?.resources.disposeAsync();
    }

    private require(): Started {
        if (!this.started) {
            throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [
                'runtime',
                'ServerDevRuntime.start() must complete first'
            ]);
        }
        return this.started;
    }

    private emit({ onEvent }: DevRuntimeContext, event: DevEvent): void {
        onEvent?.(event);
    }
}
