import { dirname } from 'node:path';

import { fromWireError, fromWireLog, wrapHot } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { setBotRoot } from '@seedcord/utils/node/internal';
import { createServer, createServerModuleRunner, mergeConfig } from 'vite';

import { functionExportsOf, WORKER_ENTRY_ID, workerEntry } from '#commands/build/builder/workerEntry';
import { importCloudflare, loadCloudflare, WORKER_ENVIRONMENT } from '#core/modules/cloudflarePlugin';
import { edgeStandIns } from '#core/modules/edgeStandIns';
import { RunnerModuleLoader } from '#core/modules/RunnerModuleLoader';
import { seedcordDependents } from '#core/modules/seedcordDependents';
import { userCodeConfig, WORKERD_CONDITIONS } from '#core/modules/userCodeConfig';
import { ProjectFiles, viteKey } from '#core/project/ProjectFiles';

import { logsIgnore } from './devServerConfig';
import { loadEntry } from './loadEntry';
import { workerLogger } from './workerLogger';

import type { EdgeTarget } from '#core/config/detectTarget';
import type { ImportCloudflare } from '#core/modules/cloudflarePlugin';
import type { DevRuntime, DevRuntimeContext, DevRuntimeLoadResult } from './DevRuntime';
import type { DevEvent } from './events';
import type {
    DevChannel,
    SeedcordCliEvents,
    SeedcordFrameworkEvents,
    SeedcordInstance
} from '@seedcord/types/internal';
import type { Plugin, ViteDevServer } from 'vite';

interface Started {
    readonly context: DevRuntimeContext;
    readonly server: ViteDevServer;
    readonly modules: RunnerModuleLoader;
}

// workerd's own cloudflare:workers and envapt binding stay in the worker environment
function inNodeOnly(plugin: Plugin): Plugin {
    return { ...plugin, applyToEnvironment: (environment) => environment.name === 'ssr' };
}

// the cloudflare plugin loads the worker entry during createServer
// keep this ahead of cloudflare(). the entry reads its named exports off this copy
function nodeCopy(onReady: (modules: RunnerModuleLoader) => void): Plugin {
    return {
        name: 'seedcord:node-copy',
        async configureServer(server) {
            const modules = new RunnerModuleLoader(createServerModuleRunner(server.environments.ssr, { hmr: false }));
            await modules.bindEdgeEnv();
            onReady(modules);
        }
    };
}

// runs an edge bot in workerd. The ssr environment holds the copy codegen reads
export class EdgeDevRuntime implements DevRuntime {
    private started?: Started | undefined;
    private settleStart?: (() => void) | undefined;

    public constructor(
        private readonly target: EdgeTarget,
        private readonly importPlugin: ImportCloudflare = importCloudflare
    ) {}

    public async start(context: DevRuntimeContext): Promise<void> {
        const { config } = context;
        const viteRoot = dirname(this.target.wranglerConfig);
        const configDir = dirname(config.configFile);
        const files = new ProjectFiles(config.root, config.build.outDir, configDir);
        setBotRoot(config.root);
        this.emit(context, { type: 'module-loading', path: config.root });

        const [folders, cloudflare] = await Promise.all([
            files.foldersIncludingEmpty(),
            loadCloudflare(viteRoot, this.importPlugin)
        ]);
        const modulesReady = Promise.withResolvers<RunnerModuleLoader>();
        const server = await createServer(
            mergeConfig(userCodeConfig(WORKERD_CONDITIONS), {
                root: viteRoot,
                configFile: false,
                customLogger: workerLogger((record) => this.emit(context, { type: 'log', record })),
                clearScreen: false,
                server: { middlewareMode: true, watch: { ignored: [logsIgnore(config.root)] } },
                ssr: { noExternal: seedcordDependents(configDir) },
                // the plugin's dep scan finds nothing in a virtual main.
                // vite then reloads during the first load and leaves a second envapt with no source bound
                environments: { [WORKER_ENVIRONMENT]: { optimizeDeps: { entries: [`${config.root}/**/*.ts`] } } },
                plugins: [
                    workerEntry({
                        files,
                        folders,
                        instanceKey: viteKey(viteRoot, config.instance),
                        rootKey: viteKey(viteRoot, config.root),
                        functionExports: async () => functionExportsOf(await modulesReady.promise, config.instance),
                        mode: { kind: 'dev', root: config.root }
                    }),
                    inNodeOnly(edgeStandIns()),
                    nodeCopy(modulesReady.resolve),
                    cloudflare({
                        configPath: this.target.wranglerConfig,
                        config: { main: WORKER_ENTRY_ID },
                        viteEnvironment: { name: WORKER_ENVIRONMENT },
                        inspectorPort: false
                    })
                ]
            })
        );
        const modules = await modulesReady.promise;
        this.started = { context, server, modules };
        // the worker already filtered by its own level
        this.workerChannel().on('seedcord:log', (record) => {
            this.emit(context, { type: 'log', record: fromWireLog(record) });
        });

        this.emit(context, { type: 'module-loaded', path: config.root });
        this.emit(context, { type: 'ready' });
    }

    public importModule<TModule = unknown>(path: string): Promise<TModule> {
        return this.require().modules.importModule<TModule>(path);
    }

    public loadEntry(): Promise<DevRuntimeLoadResult> {
        const { context, modules } = this.require();
        return loadEntry(modules, context);
    }

    // the worker runs its own copy of the bot
    public startBot(_instance: SeedcordInstance): Promise<string | undefined> {
        const cli = this.workerChannel();
        return new Promise((resolve, reject) => {
            this.settleStart = () => resolve(undefined);
            cli.on('seedcord:started', ({ username }) => resolve(username));
            cli.on('seedcord:start-failed', ({ error }) => reject(fromWireError(error)));
            cli.send('seedcord:start', {});
        });
    }

    // closing the server ends workerd
    public async stopBot(): Promise<void> {
        this.settleStart?.();
        await this.close();
    }

    public async dispose(): Promise<void> {
        await this.close();
        setBotRoot(undefined);
    }

    private async close(): Promise<void> {
        const { started } = this;
        this.started = undefined;
        await started?.server.close();
    }

    private workerChannel(): DevChannel<SeedcordCliEvents, SeedcordFrameworkEvents> {
        const { context, server } = this.require();
        const worker = server.environments[WORKER_ENVIRONMENT];
        if (!worker) {
            throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [
                context.config.instance,
                `@cloudflare/vite-plugin created no "${WORKER_ENVIRONMENT}" environment for the worker`
            ]);
        }
        return wrapHot<SeedcordCliEvents, SeedcordFrameworkEvents>(worker.hot);
    }

    private require(): Started {
        if (!this.started) {
            throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [
                'runtime',
                'WorkerDevRuntime.start() must complete first'
            ]);
        }
        return this.started;
    }

    private emit({ onEvent }: DevRuntimeContext, event: DevEvent): void {
        onEvent?.(event);
    }
}
