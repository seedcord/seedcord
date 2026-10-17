import { createServerModuleRunner } from 'vite';

import { edgeStandIns } from './edgeStandIns';
import { openViteServer } from './openViteServer';
import { RunnerModuleLoader } from './RunnerModuleLoader';
import { seedcordDependents } from './seedcordDependents';
import { mergeViteConfig, NODE_CONDITIONS, WORKERD_CONDITIONS, userCodeConfig } from './userCodeConfig';
import { WorkerEnv } from './workerEnv';

import type { BuildTarget } from '#core/config/detectTarget';
import type { LoaderUse, ModuleLoader } from './ModuleLoader';
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

function lazyWorkerEnv(cloudflareConfig: string, mode: string): () => Promise<WorkerEnv> {
    let loading: Promise<WorkerEnv> | undefined;
    return () => (loading ??= WorkerEnv.load(cloudflareConfig, mode));
}

export async function openModuleLoader(
    projectDir: string,
    target: BuildTarget,
    mode: string,
    use: LoaderUse
): Promise<ModuleLoader & AsyncDisposable> {
    const runsWorkerCode = target.kind === 'edge' && use !== 'config';
    const vitePlugins = use === 'config' ? [] : use.vitePlugins;
    const workerEnv = target.kind === 'edge' ? lazyWorkerEnv(target.cloudflareConfig, mode) : undefined;
    // read up front because the runner reports anything a load hook throws as CoreImportFailed
    if (runsWorkerCode) await workerEnv?.();
    const config = mergeViteConfig(userCodeConfig(runsWorkerCode ? WORKERD_CONDITIONS : NODE_CONDITIONS), {
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
        plugins: [...(workerEnv ? [edgeStandIns(workerEnv)] : []), ...vitePlugins]
    });
    await using onFailure = new AsyncDisposableStack();
    const server = await openViteServer(onFailure, config);
    const runner = createServerModuleRunner(server.environments.ssr, { hmr: false });
    onFailure.defer(() => runner.close());

    const loader = new ViteModuleLoader(server, runner);
    if (runsWorkerCode) await loader.bindEdgeEnv();

    onFailure.move();
    return loader;
}
