import { relative } from 'node:path';

import { createServer, createServerModuleRunner, mergeConfig } from 'vite';
import { EvaluatedModules } from 'vite/module-runner';

import { HmrPlugin } from './HmrPlugin';
import viteConfig from './vite.config';

import type { DevRuntime, DevRuntimeContext, DevRuntimeEventHandler, DevRuntimeLoadResult } from './DevRuntime';
import type { ViteDevServer } from 'vite';
import type { ModuleRunner } from 'vite/module-runner';

/**
 * Vite-based DevRuntime implementation that uses Vite's dev server and module runtime.
 */
export class ViteDevRuntime implements DevRuntime {
    private context: DevRuntimeContext | null = null;
    private viteServer: ViteDevServer | null = null;
    private moduleRunner: ModuleRunner | null = null;
    private eventHandler: DevRuntimeEventHandler | null = null;
    private evaluatedModules: EvaluatedModules | null = null;

    public async start(context: DevRuntimeContext): Promise<void> {
        this.context = context;
        this.eventHandler = context.onEvent ?? null;

        const projectRoot = this.context.config.root;

        this.emit({ type: 'module-loading', path: projectRoot });

        const hmrPlugin = new HmrPlugin(this.context.config);

        const config = mergeConfig(viteConfig, {
            root: projectRoot,
            plugins: [hmrPlugin.plugin]
        });

        this.viteServer = await createServer(config);

        this.evaluatedModules = new EvaluatedModules();
        this.moduleRunner = createServerModuleRunner(this.viteServer.environments.ssr, {
            evaluatedModules: this.evaluatedModules
        });

        hmrPlugin.on('invalidate', (file) => {
            const relPath = relative(projectRoot, file);
            const moduleId = `/${relPath}`;
            const moduleNode = this.evaluatedModules?.getModuleById(moduleId);
            if (moduleNode) {
                this.evaluatedModules?.invalidateModule(moduleNode);
            }
        });

        hmrPlugin.on('restart-needed', () => {
            this.emit({ type: 'restart-required' });
        });

        this.emit({ type: 'module-loaded', path: projectRoot });
        this.emit({ type: 'ready' });
    }

    public async loadEntry(): Promise<DevRuntimeLoadResult> {
        if (!this.context || !this.viteServer || !this.moduleRunner) {
            throw new Error('ViteDevRuntime.start() must be called before loadEntry()');
        }

        const { instance: entryPath } = this.context.config;
        const projectRoot = this.context.config.root;
        const startTime = performance.now();

        this.emit({ type: 'module-loading', path: entryPath });

        try {
            const relPath = relative(projectRoot, entryPath);
            const moduleId = `/${relPath}`;

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
        if (this.viteServer) {
            await this.viteServer.close();
            this.viteServer = null;
        }

        this.context = null;
        this.eventHandler = null;
    }

    private emit(event: Parameters<DevRuntimeEventHandler>[0]): void {
        this.eventHandler?.(event);
    }
}
