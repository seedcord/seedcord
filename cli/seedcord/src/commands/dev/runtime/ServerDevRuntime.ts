import { dirname } from 'node:path';

import { HostDevServer, HostDevUrl, HostListenHost } from '@seedcord/types/internal';
import { createServerModuleRunner } from 'vite';

import { listenHostFor, stableUrlOf } from '#commands/dev/tunnel/listenHost';
import { botEnvironment } from '#core/modules/botEnvironment';
import { envBootstrap } from '#core/modules/envBootstrap';
import { RunnerModuleLoader } from '#core/modules/RunnerModuleLoader';

import { BaseDevRuntime } from './BaseDevRuntime';
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

        const pageServer = await this.openPageServer(
            context,
            resources,
            (sockets) => serverViteConfig(config, context.files.layout, sockets),
            [
                envBootstrap({ runtime: 'node', directory: dirname(config.configFile) }),
                hmr.plugin,
                context.files.client.vitePlugin({ edge: false }),
                config.vitePlugins.create()
            ]
        );

        const modules = resources.use(
            new RunnerModuleLoader(createServerModuleRunner(botEnvironment(pageServer.vite.environments)))
        );

        await modules.bindEnv();
        return { context, modules, hmr, pageServer, resources };
    }

    public startBot(instance: SeedcordInstance): Promise<string | undefined> {
        const { context, pageServer } = this.require('startBot');
        const { tunnel } = context.config;
        instance[HostListenHost] = listenHostFor(tunnel);
        instance[HostDevUrl] = stableUrlOf(tunnel);
        instance[HostDevServer] = pageServer;
        return this.lifecycle.start(instance);
    }

    protected stopInstance(): Promise<void> {
        return this.lifecycle.stop();
    }
}
