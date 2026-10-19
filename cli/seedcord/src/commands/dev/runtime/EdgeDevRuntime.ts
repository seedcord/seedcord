import { basename, dirname } from 'node:path';

import { fromWireError, wrapHot } from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';
import { displayPath } from '@seedcord/errors/internal';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { installNodeDefaults } from '@seedcord/logger/node';
import { filterCirculars } from '@seedcord/utils';
import chalk from 'chalk';
import { createServerModuleRunner } from 'vite';

import { CloudflareWorker } from '#commands/build/builder/CloudflareWorker';
import { workerEntry } from '#commands/build/builder/workerEntry';
import { listenHostFor } from '#commands/dev/tunnel/listenHost';
import { rethrowVitePluginError } from '#core/config/vitePlugins';
import { reportWorkerExports } from '#core/modules/cloudflarePlugin';
import { edgeStandIns } from '#core/modules/edgeStandIns';
import { openViteServer } from '#core/modules/openViteServer';
import { RunnerModuleLoader } from '#core/modules/RunnerModuleLoader';
import { BOT_ENVIRONMENT, CODEGEN_ENVIRONMENT, environmentNamed, mergeViteConfig } from '#core/modules/userCodeConfig';
import { WorkerEnv } from '#core/modules/workerEnv';
import { functionExportsOf } from '#core/modules/workerExports';
import { ProjectFiles, viteKey } from '#core/project/ProjectFiles';

import { BaseDevRuntime } from './BaseDevRuntime';
import { edgeViteConfig } from './devServerConfig';
import { listenForInteractions } from './listenForInteractions';
import { loadWorkerEntry } from './loadWorkerEntry';

import type { ResolvedEdgeTarget } from '#core/config/schema';
import type { StartedRuntime } from './BaseDevRuntime';
import type { DevRuntimeContext } from './DevRuntime';
import type {
    DevChannel,
    SeedcordCliEvents,
    SeedcordFrameworkEvents,
    SeedcordInstance
} from '@seedcord/types/internal';
import type { DevEnvironment, Plugin, ViteDevServer } from 'vite';

interface EdgeStarted extends StartedRuntime {
    readonly server: ViteDevServer;
    readonly port: number;
}

// workerd gives the worker environment its own cloudflare:workers and envapt binding
function inNodeOnly(plugin: Plugin): Plugin {
    return { ...plugin, applyToEnvironment: (environment) => environment.name === CODEGEN_ENVIRONMENT };
}

function nodeCopy(onReady: (modules: RunnerModuleLoader) => void): Plugin {
    return {
        name: 'seedcord:node-copy',
        async configureServer(server) {
            const copy = environmentNamed(server.environments, CODEGEN_ENVIRONMENT);
            const modules = new RunnerModuleLoader(createServerModuleRunner(copy, { hmr: false }));
            await modules.bindEdgeEnv();
            onReady(modules);
        }
    };
}

function workerEnvironment(server: ViteDevServer): DevEnvironment {
    const fix = `${paint.bold('@cloudflare/vite-plugin')} creates it. Install the version seedcord's peer dependency asks for.`;
    return environmentNamed(server.environments, BOT_ENVIRONMENT, fix);
}

function workerChannel(server: ViteDevServer): DevChannel<SeedcordCliEvents, SeedcordFrameworkEvents> {
    return wrapHot<SeedcordCliEvents, SeedcordFrameworkEvents>(workerEnvironment(server).hot);
}

// cloudflare/workers-sdk#16339, remove once it's fixed
// the plugin's Response.json throws on an error with a circular field
function invokeErrorsAsJson(): Plugin {
    return {
        name: 'seedcord:invoke-errors-as-json',
        configureServer(server) {
            const { hot } = workerEnvironment(server);
            const handleInvoke = hot.handleInvoke.bind(hot);
            hot.handleInvoke = async (payload) => {
                const result = await handleInvoke(payload);
                if (!('error' in result)) return result;
                return { error: filterCirculars<unknown>(result.error, { mode: 'json' }) };
            };
        }
    };
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
        const { viteRoot } = this.target;
        const files = new ProjectFiles(config.root, dirname(config.configFile));
        installCliLogSinks(resources);
        this.emit(context, { type: 'progress', status: 'Loading Cloudflare plugin…' });
        const [folders, cloudflare, workerEnv] = await Promise.all([
            files.foldersIncludingEmpty(),
            CloudflareWorker.load(this.target),
            WorkerEnv.load(this.target.cloudflareConfig, config.viteMode)
        ]);
        const modulesReady = Promise.withResolvers<RunnerModuleLoader>();
        // vite reruns the entry's load hook after any update that reaches the entry. bot.ts throws when it runs a second time
        let functionExports: Promise<string[]> | undefined;
        const hmr = this.openHmr(context, BOT_ENVIRONMENT, resources, [
            basename(this.target.cloudflareConfig),
            ...workerEnv.files
        ]);
        const server = await openViteServer(
            resources,
            mergeViteConfig(edgeViteConfig(config, viteRoot, process.cwd()), {
                mode: config.viteMode,
                plugins: [
                    workerEntry({
                        files,
                        folders,
                        instanceKey: viteKey(viteRoot, config.instance),
                        rootKey: viteKey(viteRoot, config.root),
                        functionExports: () =>
                            (functionExports ??= this.readFunctionExports(context, modulesReady.promise)),
                        mode: { kind: 'dev', root: config.root, cwd: process.cwd() }
                    }),
                    inNodeOnly(edgeStandIns(() => Promise.resolve(workerEnv))),
                    // cloudflare() loads the worker entry during createServer. the entry's export list comes from this copy
                    nodeCopy(modulesReady.resolve),
                    hmr.plugin,
                    invokeErrorsAsJson(),
                    cloudflare.plugins(),
                    ...config.vitePlugins
                ]
            })
        ).catch(rethrowVitePluginError);
        await loadWorkerEntry(server.middlewares, config.instance);
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

    private async readFunctionExports(
        context: DevRuntimeContext,
        modulesReady: Promise<RunnerModuleLoader>
    ): Promise<string[]> {
        const { instance } = context.config;
        this.emit(context, { type: 'progress', status: `Importing ${displayPath(instance)}…` });
        const names = await functionExportsOf(await modulesReady, instance);
        reportWorkerExports(names);
        this.emit(context, { type: 'progress', status: 'Starting workerd…' });
        return names;
    }

    // workerd runs its own copy of the bot
    public startBot(_instance: SeedcordInstance): Promise<string | undefined> {
        const { context, server, port } = this.require('startBot');
        const cli = workerChannel(server);
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
