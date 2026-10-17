import { createServer, createServerModuleRunner } from 'vite';

import { edgeStandIns } from './edgeStandIns';
import { RunnerModuleLoader } from './RunnerModuleLoader';
import { seedcordDependents } from './seedcordDependents';
import { mergeViteConfig, NODE_CONDITIONS, WORKERD_CONDITIONS, userCodeConfig } from './userCodeConfig';
import { WorkerEnv } from './workerEnv';

import type { BuildTarget } from '#core/config/detectTarget';
import type { ModuleLoader } from './ModuleLoader';
import type { ViteDevServer } from 'vite';
import type { ModuleRunner } from 'vite/module-runner';

class ViteModuleLoader extends RunnerModuleLoader implements AsyncDisposable {
    constructor(
        private readonly server: ViteDevServer,
        runner: ModuleRunner
    ) {
        super(runner);
    }

    public async [Symbol.asyncDispose](): Promise<void> {
        await this.runner.close();
        await this.server.close();
    }
}

export async function openModuleLoader(
    projectDir: string,
    target: BuildTarget,
    mode: string
): Promise<ModuleLoader & AsyncDisposable> {
    const isEdge = target.kind === 'edge';
    const config = mergeViteConfig(userCodeConfig(isEdge ? WORKERD_CONDITIONS : NODE_CONDITIONS), {
        root: projectDir,
        mode,
        configFile: false,
        logLevel: 'error',
        clearScreen: false,
        // hmr: false still opens vite's websocket on 24678
        server: { middlewareMode: true, hmr: false, ws: false, watch: null },
        // the ssr runner never reads the client dep cache in node_modules/.vite
        optimizeDeps: { noDiscovery: true, include: [] },
        ssr: { noExternal: seedcordDependents(projectDir) },
        plugins: isEdge ? [edgeStandIns(await WorkerEnv.load(target.cloudflareConfig, mode))] : []
    });
    await using onFailure = new AsyncDisposableStack();
    const server = await createServer(config);
    onFailure.defer(() => server.close());
    const runner = createServerModuleRunner(server.environments.ssr, { hmr: false });
    onFailure.defer(() => runner.close());

    const loader = new ViteModuleLoader(server, runner);
    if (isEdge) await loader.bindEdgeEnv();

    onFailure.move();
    return loader;
}
