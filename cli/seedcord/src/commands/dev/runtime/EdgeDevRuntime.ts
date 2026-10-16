import { dirname, relative } from 'node:path';

import { fromWireError, wrapHot } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { installNodeDefaults } from '@seedcord/logger/node';
import chalk from 'chalk';
import { createServer, createServerModuleRunner } from 'vite';

import { WORKER_ENTRY_ID, workerEntry } from '#commands/build/builder/workerEntry';
import { listenHostFor } from '#commands/dev/tunnel/listenHost';
import { importCloudflare, loadCloudflare, WORKER_ENVIRONMENT } from '#core/modules/cloudflarePlugin';
import { edgeStandIns } from '#core/modules/edgeStandIns';
import { RunnerModuleLoader } from '#core/modules/RunnerModuleLoader';
import { mergeViteConfig } from '#core/modules/userCodeConfig';
import { functionExportsOf } from '#core/modules/workerExports';
import { ProjectFiles, viteKey } from '#core/project/ProjectFiles';

import { BaseDevRuntime } from './BaseDevRuntime';
import { edgeViteConfig } from './devServerConfig';
import { listenForInteractions } from './listenForInteractions';
import { WorkerConfigFiles } from './workerConfigFiles';

import type { ResolvedEdgeTarget } from '#core/config/schema';
import type { StartedRuntime } from './BaseDevRuntime';
import type { DevRuntimeContext } from './DevRuntime';
import type {
    DevChannel,
    SeedcordCliEvents,
    SeedcordFrameworkEvents,
    SeedcordInstance
} from '@seedcord/types/internal';
import type { Plugin, ViteDevServer } from 'vite';

// vite's default mode for a dev server. vite and the cloudflare plugin read the .env and .dev.vars files named after it
const DEV_MODE = 'development';

interface EdgeStarted extends StartedRuntime {
    readonly server: ViteDevServer;
    readonly port: number;
}

// workerd gives the worker environment its own cloudflare:workers and envapt binding
function inNodeOnly(plugin: Plugin): Plugin {
    return { ...plugin, applyToEnvironment: (environment) => environment.name === 'ssr' };
}

// codegen reads a node copy of the bot out of the ssr environment
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

function workerChannel(
    server: ViteDevServer,
    instance: string
): DevChannel<SeedcordCliEvents, SeedcordFrameworkEvents> {
    const worker = server.environments[WORKER_ENVIRONMENT];
    if (!worker) {
        throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [
            instance,
            `@cloudflare/vite-plugin did not create its "${WORKER_ENVIRONMENT}" environment`
        ]);
    }
    return wrapHot<SeedcordCliEvents, SeedcordFrameworkEvents>(worker.hot);
}

// ServerHost installs these for a server bot. the edge Seedcord never does
function installCliLogSinks(stack: AsyncDisposableStack): void {
    installNodeDefaults();
    stack.defer(() => LoggerChannelRegistry.instance.configure({}));
}

export class EdgeDevRuntime extends BaseDevRuntime<EdgeStarted> {
    private settleStart?: (() => void) | undefined;

    public constructor(private readonly target: ResolvedEdgeTarget) {
        super();
    }

    protected async open(context: DevRuntimeContext, resources: AsyncDisposableStack): Promise<EdgeStarted> {
        const { config } = context;
        const viteRoot = dirname(this.target.cloudflareConfig);
        const files = new ProjectFiles(config.root, config.build.outDir, dirname(config.configFile));
        installCliLogSinks(resources);
        this.emit(context, { type: 'progress', status: 'Loading Cloudflare plugin…' });
        const [folders, cloudflare] = await Promise.all([
            files.foldersIncludingEmpty(),
            loadCloudflare(viteRoot, importCloudflare)
        ]);
        const modulesReady = Promise.withResolvers<RunnerModuleLoader>();
        const workerConfig = new WorkerConfigFiles(this.target.cloudflareConfig, DEV_MODE);
        const hmr = this.openHmr(context, WORKER_ENVIRONMENT, resources, workerConfig);
        const server = await createServer(
            mergeViteConfig(edgeViteConfig(config, viteRoot, process.cwd()), {
                mode: DEV_MODE,
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
                    // cloudflare() loads the worker entry during createServer. the entry's export list comes from this copy
                    nodeCopy(modulesReady.resolve),
                    hmr.plugin,
                    cloudflare({
                        config: { entrypoint: WORKER_ENTRY_ID },
                        viteEnvironment: { name: WORKER_ENVIRONMENT },
                        inspectorPort: false
                    })
                ]
            })
        );
        resources.defer(() => server.close());
        const modules = await modulesReady.promise;
        const endpoint = await listenForInteractions(server.middlewares, {
            port: this.target.port,
            host: listenHostFor(config.tunnel),
            configFile: config.configFile
        });
        resources.use(endpoint.server);
        // close() waits on open keep-alive sockets
        resources.defer(() => endpoint.server.closeAllConnections());
        return { context, server, modules, hmr, port: endpoint.port, resources };
    }

    // workerd runs its own copy of the bot
    public startBot(_instance: SeedcordInstance): Promise<string | undefined> {
        const { context, server, port } = this.require('startBot');
        const cli = workerChannel(server, context.config.instance);
        return new Promise((resolve, reject) => {
            this.settleStart = () => resolve(undefined);
            cli.on('seedcord:started', ({ username }) => {
                // discord pings the endpoint as soon as the tunnel points it here
                this.emit(context, { type: 'server-listening', port });
                resolve(username);
            });
            cli.on('seedcord:start-failed', ({ error }) => reject(fromWireError(error)));
            cli.send('seedcord:start', { colorLevel: chalk.level });
        });
    }

    // workerd exits once stop() closes the vite server
    protected stopInstance(): Promise<void> {
        this.settleStart?.();
        return Promise.resolve();
    }
}
