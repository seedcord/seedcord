import { relative } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { createServer, createServerModuleRunner, mergeConfig } from 'vite';
import { EvaluatedModules } from 'vite/module-runner';

import { HmrPlugin } from './HmrPlugin';
import viteConfig from './vite.config';

import type { DevRuntime, DevRuntimeContext, DevRuntimeLoadResult } from './DevRuntime';
import type { DevEvent, DevEventHandler } from './events';
import type { ViteDevServer } from 'vite';
import type { ModuleRunner } from 'vite/module-runner';

export class ViteDevRuntime implements DevRuntime {
    private context: DevRuntimeContext | null = null;
    private viteServer: ViteDevServer | null = null;
    private moduleRunner: ModuleRunner | null = null;
    private eventHandler: DevEventHandler | null = null;
    private evaluatedModules: EvaluatedModules | null = null;
    private hmrPlugin: HmrPlugin | null = null;

    public async start(context: DevRuntimeContext): Promise<void> {
        this.context = context;
        this.eventHandler = context.onEvent ?? null;

        const projectRoot = this.context.config.root;

        this.emit({ type: 'module-loading', path: projectRoot });

        const hmrPlugin = new HmrPlugin(this.context.config);
        this.hmrPlugin = hmrPlugin;

        const config = mergeConfig(viteConfig, {
            root: projectRoot,
            plugins: [hmrPlugin.plugin]
        });

        this.viteServer = await createServer(config);

        this.evaluatedModules = new EvaluatedModules();
        this.moduleRunner = createServerModuleRunner(this.viteServer.environments.ssr, {
            evaluatedModules: this.evaluatedModules
        });

        hmrPlugin.on('event', this.handleHmrEvent.bind(this));

        this.emit({ type: 'module-loaded', path: projectRoot });
        this.emit({ type: 'ready' });
    }

    private handleHmrEvent(event: DevEvent): void {
        if (event.type === 'file-change') {
            this.invalidateModule(event.path);
        }
        this.emit(event);
    }

    private invalidateModule(file: string): void {
        const projectRoot = this.context?.config.root;
        if (!projectRoot || !this.evaluatedModules) return;

        const moduleId = toModuleId(projectRoot, file);
        const moduleNode = this.evaluatedModules.getModuleById(moduleId);
        if (moduleNode) {
            this.evaluatedModules.invalidateModule(moduleNode);
        }
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
        const startTime = performance.now();

        this.emit({ type: 'module-loading', path: entryPath });

        try {
            const moduleId = toModuleId(projectRoot, entryPath);

            const module = await this.moduleRunner.import<unknown>(moduleId);
            const loadTime = performance.now() - startTime;

            this.emit({ type: 'module-loaded', path: entryPath });

            return {
                module,
                metadata: {
                    loadTime
                }
            };
        } catch (error: unknown) {
            this.emit({ type: 'module-error', path: entryPath, error });
            throw error;
        }
    }

    public async dispose(): Promise<void> {
        // Restart/disconnect dispose the runtime without exiting the process, so drop the runtime<->plugin
        // 'event' wiring and references or each new session would leak the prior one's listeners.
        this.hmrPlugin?.removeAllListeners('event');

        if (this.viteServer) {
            await this.viteServer.close();
            this.viteServer = null;
        }

        this.moduleRunner = null;
        this.evaluatedModules = null;
        this.hmrPlugin = null;
        this.context = null;
        this.eventHandler = null;
    }

    private emit(event: DevEvent): void {
        this.eventHandler?.(event);
    }
}

// Vite normalizes module ids to forward slashes; relative() yields backslashes on Windows, so normalize.
function toModuleId(projectRoot: string, file: string): string {
    return `/${relative(projectRoot, file).replaceAll('\\', '/')}`;
}
