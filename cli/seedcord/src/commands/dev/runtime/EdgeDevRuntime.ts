import { basename, dirname } from 'node:path';

import { fromWireError, wrapHot } from '@seedcord/core/internal';
import { displayPath } from '@seedcord/errors/internal';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { installNodeDefaults } from '@seedcord/logger/node';
import { filterCirculars } from '@seedcord/utils';
import { BotLayout } from '@seedcord/utils/internal';
import chalk from 'chalk';
import { Envapter, FileSource, merge, PortableSource } from 'envapt';

import { CloudflareWorker } from '#commands/build/builder/CloudflareWorker';
import { workerEntry } from '#commands/build/builder/workerEntry';
import { listenHostFor } from '#commands/dev/tunnel/listenHost';
import { rethrowVitePluginError } from '#core/config/vitePlugins';
import { BOT_ENVIRONMENT, botEnvironment } from '#core/modules/botEnvironment';
import { reportWorkerExports } from '#core/modules/cloudflarePlugin';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { openViteServer } from '#core/modules/openViteServer';
import { mergeViteConfig } from '#core/modules/userCodeConfig';
import { WorkerEnv } from '#core/modules/workerEnv';
import { functionExportsOf } from '#core/modules/workerExports';

import { BaseDevRuntime } from './BaseDevRuntime';
import { devWatchOptions, edgeViteConfig } from './devServerConfig';
import { fenceSignals } from './fenceSignals';
import { listenForInteractions } from './listenForInteractions';
import { loadWorkerEntry } from './loadWorkerEntry';

import type { ResolvedEdgeTarget } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
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
    readonly port: number;
}

function workerChannel(server: ViteDevServer): DevChannel<SeedcordCliEvents, SeedcordFrameworkEvents> {
    return wrapHot<SeedcordCliEvents, SeedcordFrameworkEvents>(botEnvironment(server.environments).hot);
}

// cloudflare/workers-sdk#16339, remove once it's fixed
// the plugin's Response.json throws on an error with a circular field
function invokeErrorsAsJson(): Plugin {
    return {
        name: 'seedcord:invoke-errors-as-json',
        configureServer(server) {
            const { hot } = botEnvironment(server.environments);
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

// the tunnel and the dev lock read the bot's token in this process
function bindWorkerEnvToCli(workerEnv: WorkerEnv, stack: AsyncDisposableStack): void {
    // eslint-disable-next-line @eslint-react/rules-of-hooks, react-hooks/rules-of-hooks -- envapt isn't react
    Envapter.useSource(merge(new FileSource(), new PortableSource(workerEnv.values())));
    stack.defer(() => Envapter.useSource(new FileSource()));
}

export class EdgeDevRuntime extends BaseDevRuntime<EdgeStarted> {
    private settleStart?: (() => void) | undefined;

    public constructor(private readonly target: ResolvedEdgeTarget) {
        super();
    }

    protected async open(context: DevRuntimeContext, resources: AsyncDisposableStack): Promise<EdgeStarted> {
        const { config } = context;
        const { files } = context;
        const { viteRoot } = this.target;
        resources.use(fenceSignals());
        installCliLogSinks(resources);
        this.emit(context, { type: 'progress', status: 'Loading Cloudflare plugin…' });
        const [folders, cloudflare, workerEnv] = await Promise.all([
            files.foldersIncludingEmpty(),
            CloudflareWorker.load(this.target),
            WorkerEnv.load(this.target.cloudflareConfig, config.viteMode)
        ]);
        bindWorkerEnvToCli(workerEnv, resources);
        const nodeCopy = await openModuleLoader(dirname(config.configFile), this.target, config.viteMode, config, {
            watch: devWatchOptions(files.layout),
            workerEnv
        }).catch(rethrowVitePluginError);
        resources.use(nodeCopy);
        // vite reruns the entry's load hook after any update that reaches the entry. bot.ts throws when it runs a second time
        let functionExports: Promise<string[]> | undefined;
        const hmr = this.openHmr(context, BOT_ENVIRONMENT, resources, [
            basename(this.target.cloudflareConfig),
            ...workerEnv.files
        ]);
        const server = await openViteServer(
            resources,
            mergeViteConfig(edgeViteConfig(files.layout, viteRoot), {
                mode: config.viteMode,
                plugins: [
                    workerEntry({
                        layout: files.layout,
                        folders,
                        instanceKey: BotLayout.keyUnder(viteRoot, config.instance),
                        rootKey: BotLayout.keyUnder(viteRoot, config.root),
                        functionExports: () => (functionExports ??= this.readFunctionExports(context, nodeCopy)),
                        mode: { kind: 'dev', root: config.root, cwd: process.cwd() }
                    }),
                    hmr.plugin,
                    invokeErrorsAsJson(),
                    cloudflare.plugins(),
                    config.vitePlugins.create()
                ]
            })
        ).catch(rethrowVitePluginError);
        await loadWorkerEntry(server.middlewares, config.instance);
        const endpoint = await listenForInteractions(server.middlewares, {
            port: this.target.port,
            host: listenHostFor(config.tunnel),
            configFile: config.configFile
        });
        resources.use(endpoint.server);
        // close() waits on open keep-alive sockets
        resources.defer(() => endpoint.server.closeAllConnections());
        return { context, server, modules: nodeCopy, hmr, port: endpoint.port, resources };
    }

    private async readFunctionExports(context: DevRuntimeContext, modules: ModuleLoader): Promise<string[]> {
        const { instance } = context.config;
        this.emit(context, { type: 'progress', status: `Importing ${displayPath(instance)}…` });
        const names = await functionExportsOf(modules, instance);
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
