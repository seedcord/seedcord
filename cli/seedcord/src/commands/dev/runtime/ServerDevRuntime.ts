import { dirname } from 'node:path';

import { HostDevServer, HostDevUrl, HostListenHost } from '@seedcord/types/internal';
import { createServerModuleRunner } from 'vite';

import { listenHostFor, stableUrlOf } from '#commands/dev/tunnel/listenHost';
import { rethrowVitePluginError } from '#core/config/vitePlugins';
import { botEnvironment } from '#core/modules/botEnvironment';
import { envBootstrap } from '#core/modules/envBootstrap';
import { openViteServer } from '#core/modules/openViteServer';
import { RunnerModuleLoader } from '#core/modules/RunnerModuleLoader';
import { mergeViteConfig } from '#core/modules/userCodeConfig';

import { BaseDevRuntime } from './BaseDevRuntime';
import { DevFront, viteSocketServer } from './DevFront';
import { serverViteConfig } from './devServerConfig';
import { InstanceLifecycle } from './InstanceLifecycle';

import type { StartedRuntime } from './BaseDevRuntime';
import type { DevRuntimeContext } from './DevRuntime';
import type { SeedcordInstance } from '@seedcord/types/internal';

export class ServerDevRuntime extends BaseDevRuntime {
    private readonly lifecycle = new InstanceLifecycle();

    protected async open(context: DevRuntimeContext, resources: AsyncDisposableStack): Promise<StartedRuntime> {
        const { config } = context;
        const hmr = this.openHmr(context, resources);
        const sockets = viteSocketServer();
        const server = await openViteServer(
            resources,
            mergeViteConfig(serverViteConfig(config, context.files.layout, sockets), {
                mode: config.viteMode,
                plugins: [
                    envBootstrap({ runtime: 'node', directory: dirname(config.configFile) }),
                    hmr.plugin,
                    context.files.client.vitePlugin({ edge: false }),
                    config.vitePlugins.create()
                ]
            })
        ).catch(rethrowVitePluginError);
        const modules = resources.use(
            new RunnerModuleLoader(createServerModuleRunner(botEnvironment(server.environments)))
        );
        await modules.bindEnv();
        return { context, modules, hmr, front: new DevFront(server, sockets), resources };
    }

    public startBot(instance: SeedcordInstance): Promise<string | undefined> {
        const { context, front } = this.require('startBot');
        const { tunnel } = context.config;
        instance[HostListenHost] = listenHostFor(tunnel);
        instance[HostDevUrl] = stableUrlOf(tunnel);
        instance[HostDevServer] = front;
        return this.lifecycle.start(instance);
    }

    protected stopInstance(): Promise<void> {
        return this.lifecycle.stop();
    }
}
