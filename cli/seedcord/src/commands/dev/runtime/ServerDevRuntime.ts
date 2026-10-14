import { createServer, createServerModuleRunner } from 'vite';

import { RunnerModuleLoader } from '#core/modules/RunnerModuleLoader';
import { mergeViteConfig } from '#core/modules/userCodeConfig';

import { BaseDevRuntime } from './BaseDevRuntime';
import { serverViteConfig } from './devServerConfig';
import { InstanceLifecycle } from './InstanceLifecycle';

import type { DevRuntimeContext } from './DevRuntime';
import type { SeedcordInstance } from '@seedcord/types/internal';

export class ServerDevRuntime extends BaseDevRuntime {
    private readonly lifecycle = new InstanceLifecycle();

    public async start(context: DevRuntimeContext): Promise<void> {
        await using onFailure = new AsyncDisposableStack();
        this.bindBotRoot(context.config.root, onFailure);

        const hmr = this.openHmr(context, 'ssr', onFailure);
        const server = await createServer(
            mergeViteConfig(serverViteConfig(context.config, process.cwd()), { plugins: [hmr.plugin] })
        );
        onFailure.defer(() => server.close());
        const modules = new RunnerModuleLoader(createServerModuleRunner(server.environments.ssr));
        this.markStarted({ context, modules, hmr, resources: onFailure.move() });
    }

    public startBot(instance: SeedcordInstance): Promise<string | undefined> {
        return this.lifecycle.start(instance);
    }

    protected stopInstance(): Promise<void> {
        return this.lifecycle.stop();
    }
}
