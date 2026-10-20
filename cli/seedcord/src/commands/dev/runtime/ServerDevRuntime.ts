import { HostListenHost } from '@seedcord/types/internal';
import { createServerModuleRunner } from 'vite';

import { listenHostFor } from '#commands/dev/tunnel/listenHost';
import { rethrowVitePluginError } from '#core/config/vitePlugins';
import { BOT_ENVIRONMENT, botEnvironment } from '#core/modules/botEnvironment';
import { openViteServer } from '#core/modules/openViteServer';
import { RunnerModuleLoader } from '#core/modules/RunnerModuleLoader';
import { mergeViteConfig } from '#core/modules/userCodeConfig';

import { BaseDevRuntime } from './BaseDevRuntime';
import { serverViteConfig } from './devServerConfig';
import { InstanceLifecycle } from './InstanceLifecycle';

import type { StartedRuntime } from './BaseDevRuntime';
import type { DevRuntimeContext } from './DevRuntime';
import type { SeedcordInstance } from '@seedcord/types/internal';

export class ServerDevRuntime extends BaseDevRuntime {
    private readonly lifecycle = new InstanceLifecycle();

    protected async open(context: DevRuntimeContext, resources: AsyncDisposableStack): Promise<StartedRuntime> {
        const hmr = this.openHmr(context, BOT_ENVIRONMENT, resources);
        const server = await openViteServer(
            resources,
            mergeViteConfig(serverViteConfig(context.config, context.files.layout), {
                mode: context.config.viteMode,
                plugins: [hmr.plugin, context.config.vitePlugins.create()]
            })
        ).catch(rethrowVitePluginError);
        const modules = new RunnerModuleLoader(createServerModuleRunner(botEnvironment(server.environments)));
        return { context, modules, hmr, resources };
    }

    public startBot(instance: SeedcordInstance): Promise<string | undefined> {
        instance[HostListenHost] = listenHostFor(this.require('startBot').context.config.tunnel);
        return this.lifecycle.start(instance);
    }

    protected stopInstance(): Promise<void> {
        return this.lifecycle.stop();
    }
}
