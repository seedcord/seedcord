import { dirname, relative } from 'node:path';

import { fromWireError, wrapHot } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { installNodeDefaults } from '@seedcord/logger/node';
import { setBotRoot } from '@seedcord/utils/node/internal';
import chalk from 'chalk';
import { createServer, createServerModuleRunner } from 'vite';

import { moduleGlobs } from '#commands/build/builder/builtFiles';
import { functionExportsOf, WORKER_ENTRY_ID, workerEntry } from '#commands/build/builder/workerEntry';
import {
    importCloudflare,
    importWrangler,
    loadCloudflare,
    readDevPort,
    WORKER_ENVIRONMENT
} from '#core/modules/cloudflarePlugin';
import { edgeStandIns } from '#core/modules/edgeStandIns';
import { RunnerModuleLoader } from '#core/modules/RunnerModuleLoader';
import { seedcordDependents } from '#core/modules/seedcordDependents';
import { mergeViteConfig, userCodeConfig, WORKERD_CONDITIONS } from '#core/modules/userCodeConfig';
import { ProjectFiles, viteKey } from '#core/project/ProjectFiles';

import { BaseDevRuntime } from './BaseDevRuntime';
import { logsIgnore } from './devServerConfig';
import { listenForInteractions } from './interactionsEndpoint';
import { isWorkerConfigFile, watchWorkerConfig } from './workerConfigFiles';
import { workerLogger } from './workerLogger';

import type { EdgeTarget } from '#core/config/detectTarget';
import type { StartedRuntime } from './BaseDevRuntime';
import type { DevRuntimeContext } from './DevRuntime';
import type {
    DevChannel,
    SeedcordCliEvents,
    SeedcordFrameworkEvents,
    SeedcordInstance
} from '@seedcord/types/internal';
import type { Plugin, ViteDevServer } from 'vite';

interface EdgeStarted extends StartedRuntime {
    readonly server: ViteDevServer;
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

// a node bot installs the logger defaults in its constructor and resets them in ServerHost.reset
function holdProcessState(stack: AsyncDisposableStack, root: string): void {
    setBotRoot(root);
    stack.defer(() => setBotRoot(undefined));
    installNodeDefaults();
    stack.defer(() => LoggerChannelRegistry.instance.configure({}));
}

// runs an edge bot in workerd. The ssr environment holds the copy codegen reads
export class EdgeDevRuntime extends BaseDevRuntime<EdgeStarted> {
    private settleStart?: (() => void) | undefined;

    public constructor(private readonly target: EdgeTarget) {
        super();
    }

    public async start(context: DevRuntimeContext): Promise<void> {
        const { config } = context;
        const viteRoot = dirname(this.target.wranglerConfig);
        const configDir = dirname(config.configFile);
        const files = new ProjectFiles(config.root, config.build.outDir, configDir);
        await using onFailure = new AsyncDisposableStack();
        holdProcessState(onFailure, config.root);
        this.emit(context, { type: 'module-loading', path: config.root });

        this.emit(context, { type: 'progress', status: 'Loading Cloudflare plugin…' });
        const [folders, cloudflare, port] = await Promise.all([
            files.foldersIncludingEmpty(),
            loadCloudflare(viteRoot, importCloudflare),
            readDevPort(this.target.wranglerConfig, importWrangler)
        ]);
        const modulesReady = Promise.withResolvers<RunnerModuleLoader>();
        const hmr = this.openHmr(context, WORKER_ENVIRONMENT, onFailure);
        const server = await createServer(
            mergeViteConfig(userCodeConfig(WORKERD_CONDITIONS), {
                root: viteRoot,
                configFile: false,
                customLogger: workerLogger(),
                clearScreen: false,
                server: {
                    middlewareMode: true,
                    // discord's POST arrives under the tunnel's hostname. the endpoint blocks every other request
                    allowedHosts: true,
                    watch: { ignored: [logsIgnore(process.cwd()), isWorkerConfigFile(this.target.wranglerConfig)] }
                },
                ssr: { noExternal: seedcordDependents(configDir) },
                // the plugin's dep scan finds nothing in a virtual main.
                // vite then reloads during the first load and leaves a second envapt with no source bound
                environments: { [WORKER_ENVIRONMENT]: { optimizeDeps: { entries: moduleGlobs(config.root) } } },
                plugins: [
                    workerEntry({
                        files,
                        folders,
                        instanceKey: viteKey(viteRoot, config.instance),
                        rootKey: viteKey(viteRoot, config.root),
                        functionExports: async () => {
                            const instance = relative(process.cwd(), config.instance);
                            this.emit(context, { type: 'progress', status: `Importing ${instance}…` });
                            const names = await functionExportsOf(await modulesReady.promise, config.instance);
                            this.emit(context, { type: 'progress', status: 'Starting workerd…' });
                            return names;
                        },
                        mode: { kind: 'dev', root: config.root, cwd: process.cwd() }
                    }),
                    inNodeOnly(edgeStandIns()),
                    nodeCopy(modulesReady.resolve),
                    hmr.plugin,
                    cloudflare({
                        configPath: this.target.wranglerConfig,
                        config: { main: WORKER_ENTRY_ID },
                        viteEnvironment: { name: WORKER_ENVIRONMENT },
                        inspectorPort: false
                    })
                ]
            })
        );
        // closing the vite server ends workerd
        onFailure.defer(() => server.close());
        const modules = await modulesReady.promise;
        const endpoint = onFailure.use(
            await listenForInteractions(server.middlewares, port, this.target.wranglerConfig)
        );
        // the endpoint's close waits on open keep-alive sockets
        onFailure.defer(() => endpoint.closeAllConnections());
        const configWatcher = watchWorkerConfig(this.target.wranglerConfig, (file) => {
            hmr.reportChangeNeedingRestart(file);
        });
        onFailure.defer(() => configWatcher.close());
        this.markStarted({ context, server, modules, hmr, resources: onFailure.move() });
        this.emit(context, { type: 'module-loaded', path: config.root });
        this.emit(context, { type: 'ready' });
        this.emit(context, { type: 'server-listening', port });
    }

    // the worker runs its own copy of the bot
    public startBot(_instance: SeedcordInstance): Promise<string | undefined> {
        const cli = this.workerChannel();
        return new Promise((resolve, reject) => {
            this.settleStart = () => resolve(undefined);
            cli.on('seedcord:started', ({ username }) => resolve(username));
            cli.on('seedcord:start-failed', ({ error }) => reject(fromWireError(error)));
            cli.send('seedcord:start', { colorLevel: chalk.level });
        });
    }

    // closing the vite server is the only way to stop workerd
    public async stopBot(): Promise<void> {
        this.settleStart?.();
        await this.dispose();
    }

    private workerChannel(): DevChannel<SeedcordCliEvents, SeedcordFrameworkEvents> {
        const { context, server } = this.require('startBot');
        const worker = server.environments[WORKER_ENVIRONMENT];
        if (!worker) {
            throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [
                context.config.instance,
                `@cloudflare/vite-plugin created no "${WORKER_ENVIRONMENT}" environment for the worker`
            ]);
        }
        return wrapHot<SeedcordCliEvents, SeedcordFrameworkEvents>(worker.hot);
    }
}
