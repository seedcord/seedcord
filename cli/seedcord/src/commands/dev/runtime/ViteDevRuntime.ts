import { dirname, relative } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { createServer, createServerModuleRunner, mergeConfig } from 'vite';

import { seedcordDependents } from '#core/modules/seedcordDependents';

import { HmrPlugin } from './HmrPlugin';
import { devServerConfig, logsIgnore } from './vite.config';

import type { DevRuntime, DevRuntimeContext, DevRuntimeLoadResult } from './DevRuntime';
import type { DevEvent, DevEventHandler } from './events';
import type { ViteDevServer } from 'vite';
import type { ModuleRunner } from 'vite/module-runner';

export class ViteDevRuntime implements DevRuntime {
    private context: DevRuntimeContext | null = null;
    private viteServer: ViteDevServer | null = null;
    private moduleRunner: ModuleRunner | null = null;
    private eventHandler: DevEventHandler | null = null;
    private hmrPlugin: HmrPlugin | null = null;

    public async start(context: DevRuntimeContext): Promise<void> {
        this.context = context;
        this.eventHandler = context.onEvent ?? null;

        const projectRoot = this.context.config.root;

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

        this.moduleRunner = createServerModuleRunner(this.viteServer.environments.ssr);

        hmrPlugin.on('event', this.emit.bind(this));

        this.emit({ type: 'module-loaded', path: projectRoot });
        this.emit({ type: 'ready' });
    }

    public refreshCommands(shouldRefresh: boolean): void {
        this.hmrPlugin?.sendRefreshCommands(shouldRefresh);
    }

    public async loadEntry(): Promise<DevRuntimeLoadResult> {
        if (!this.context || !this.viteServer || !this.moduleRunner) {
            throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [
                this.context?.config.instance ?? 'runtime',
                'ViteDevRuntime.start() must complete before loadEntry()'
            ]);
        }

        const { instance: entryPath } = this.context.config;
        const projectRoot = this.context.config.root;

        this.emit({ type: 'module-loading', path: entryPath });

        try {
            const moduleId = toModuleId(projectRoot, entryPath);

            const module = await this.moduleRunner.import<unknown>(moduleId);

            this.emit({ type: 'module-loaded', path: entryPath });

            return { module };
        } catch (error: unknown) {
            this.emit({ type: 'module-error', path: entryPath, error });
            throw error;
        }
    }

    public async dispose(): Promise<void> {
        // restart and disconnect dispose the runtime without exiting the process, so drop the event
        // wiring here, else each new session leaks the last one's listeners
        this.hmrPlugin?.removeAllListeners('event');

        if (this.viteServer) {
            await this.viteServer.close();
            this.viteServer = null;
        }

        this.moduleRunner = null;
        this.hmrPlugin = null;
        this.context = null;
        this.eventHandler = null;
    }

    private emit(event: DevEvent): void {
        this.eventHandler?.(event);
    }
}

// vite normalizes module ids to forward slashes. relative() yields backslashes on windows
function toModuleId(projectRoot: string, file: string): string {
    return `/${relative(projectRoot, file).replaceAll('\\', '/')}`;
}
