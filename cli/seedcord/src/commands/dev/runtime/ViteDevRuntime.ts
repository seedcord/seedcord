import { dirname } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { setBotRoot } from '@seedcord/utils/node/internal';
import { createServer, createServerModuleRunner, mergeConfig } from 'vite';

import { RunnerModuleLoader } from '#core/modules/RunnerModuleLoader';
import { seedcordDependents } from '#core/modules/seedcordDependents';

import { devServerConfig, logsIgnore } from './devServerConfig';
import { HmrPlugin } from './HmrPlugin';
import { InstanceLifecycle } from './InstanceLifecycle';
import { loadEntry } from './loadEntry';

import type { DevRuntime, DevRuntimeContext, DevRuntimeLoadResult } from './DevRuntime';
import type { DevEvent, DevEventHandler } from './events';
import type { SeedcordInstance } from '@seedcord/types/internal';
import type { ViteDevServer } from 'vite';

export class ViteDevRuntime implements DevRuntime {
    private context: DevRuntimeContext | null = null;
    private viteServer: ViteDevServer | null = null;
    private modules: RunnerModuleLoader | null = null;
    private eventHandler: DevEventHandler | null = null;
    private hmrPlugin: HmrPlugin | null = null;
    private readonly lifecycle = new InstanceLifecycle();

    public async start(context: DevRuntimeContext): Promise<void> {
        this.context = context;
        this.eventHandler = context.onEvent ?? null;

        const projectRoot = this.context.config.root;
        setBotRoot(projectRoot);

        this.emit({ type: 'module-loading', path: projectRoot });

        const hmrPlugin = new HmrPlugin(this.context.config);
        this.hmrPlugin = hmrPlugin;

        const projectDir = dirname(this.context.config.configFile);

        // vite writes resolved options back into the config object it receives
        const base = structuredClone(devServerConfig);

        // vite searches its own root for a config file
        const config = mergeConfig(base, {
            root: projectRoot,
            configFile: false,
            server: { watch: { ignored: [logsIgnore(projectRoot)] } },
            // an external plugin would load node's copy of @seedcord/core beside vite's
            ssr: { noExternal: seedcordDependents(projectDir) },
            plugins: [hmrPlugin.plugin]
        });

        this.viteServer = await createServer(config);

        this.modules = new RunnerModuleLoader(createServerModuleRunner(this.viteServer.environments.ssr));

        hmrPlugin.on('event', this.emit.bind(this));

        this.emit({ type: 'module-loaded', path: projectRoot });
        this.emit({ type: 'ready' });
    }

    public startBot(instance: SeedcordInstance): Promise<string | undefined> {
        return this.lifecycle.start(instance);
    }

    public stopBot(): Promise<void> {
        return this.lifecycle.stop();
    }

    public refreshCommands(shouldRefresh: boolean): void {
        this.hmrPlugin?.sendRefreshCommands(shouldRefresh);
    }

    public async importModule<TModule = unknown>(path: string): Promise<TModule> {
        return this.started().modules.importModule<TModule>(path);
    }

    public loadEntry(): Promise<DevRuntimeLoadResult> {
        const { context, modules } = this.started();
        return loadEntry(modules, context);
    }

    public async dispose(): Promise<void> {
        // restart and disconnect dispose the runtime without exiting the process, so drop the event
        // wiring here, else each new session leaks the last one's listeners
        this.hmrPlugin?.removeAllListeners('event');

        if (this.viteServer) {
            await this.viteServer.close();
            this.viteServer = null;
        }

        this.modules = null;
        this.hmrPlugin = null;
        this.context = null;
        this.eventHandler = null;
        setBotRoot(undefined);
    }

    private started(): { context: DevRuntimeContext; modules: RunnerModuleLoader } {
        if (!this.context || !this.modules) {
            throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [
                this.context?.config.instance ?? 'runtime',
                'ViteDevRuntime.start() must complete first'
            ]);
        }
        return { context: this.context, modules: this.modules };
    }

    private emit(event: DevEvent): void {
        this.eventHandler?.(event);
    }
}
