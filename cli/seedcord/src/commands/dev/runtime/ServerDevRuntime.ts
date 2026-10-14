import { createServer, createServerModuleRunner } from 'vite';

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
        const hmr = this.openHmr(context, 'ssr', resources);
        const server = await createServer(
            mergeViteConfig(serverViteConfig(context.config, process.cwd()), { plugins: [hmr.plugin] })
        );
        resources.defer(() => server.close());
        const modules = new RunnerModuleLoader(createServerModuleRunner(server.environments.ssr));
        return { context, modules, hmr, resources };
    }

    public startBot(instance: SeedcordInstance): Promise<string | undefined> {
        return this.lifecycle.start(instance);
    }

    protected stopInstance(): Promise<void> {
        return this.lifecycle.stop();
    }
}
