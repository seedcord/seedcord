import { dirname } from 'node:path';

import { createServer, createServerModuleRunner } from 'vite';

import { RunnerModuleLoader } from '#core/modules/RunnerModuleLoader';
import { seedcordDependents } from '#core/modules/seedcordDependents';
import { mergeViteConfig } from '#core/modules/userCodeConfig';

import { BaseDevRuntime } from './BaseDevRuntime';
import { devServerConfig, logsIgnore } from './devServerConfig';
import { InstanceLifecycle } from './InstanceLifecycle';

import type { DevRuntimeContext } from './DevRuntime';
import type { SeedcordInstance } from '@seedcord/types/internal';

export class ServerDevRuntime extends BaseDevRuntime {
    private readonly lifecycle = new InstanceLifecycle();

    public async start(context: DevRuntimeContext): Promise<void> {
        const { root, configFile } = context.config;
        await using onFailure = new AsyncDisposableStack();
        this.bindBotRoot(root, onFailure);

        const hmr = this.openHmr(context, 'ssr', onFailure);

        const config = mergeViteConfig(devServerConfig(), {
            root,
            // vite searches its own root for a config file
            configFile: false,
            server: { watch: { ignored: [logsIgnore(process.cwd())] } },
            // an external plugin would load node's copy of @seedcord/core beside vite's
            ssr: { noExternal: seedcordDependents(dirname(configFile)) },
            plugins: [hmr.plugin]
        });

        const server = await createServer(config);
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
