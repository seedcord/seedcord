import { createServerModuleRunner } from 'vite';

import { botEnvironment } from './botEnvironment';
import { edgeStandIns } from './edgeStandIns';
import { openViteServer } from './openViteServer';
import { RunnerModuleLoader } from './RunnerModuleLoader';
import { mergeViteConfig, NODE_CONDITIONS, WORKERD_CONDITIONS, userCodeConfig } from './userCodeConfig';
import { WorkerEnv } from './workerEnv';

import type { BuildTarget } from '#core/config/detectTarget';
import type { LoaderUse } from './ModuleLoader';
import type { ServerOptions, ViteDevServer } from 'vite';
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

interface EdgeDevCopy {
    readonly watch: NonNullable<ServerOptions['watch']>;
    readonly workerEnv: WorkerEnv;
}

function lazyWorkerEnv(cloudflareConfig: string, mode: string, loaded?: WorkerEnv): () => Promise<WorkerEnv> {
    let loading = loaded && Promise.resolve(loaded);
    return () => (loading ??= WorkerEnv.load(cloudflareConfig, mode));
}

export async function openModuleLoader(
    projectDir: string,
    target: BuildTarget,
    mode: string,
    use: LoaderUse,
    devCopy?: EdgeDevCopy
): Promise<RunnerModuleLoader & AsyncDisposable> {
    const runsWorkerCode = target.kind === 'edge' && use !== 'config';
    const workerEnv =
        target.kind === 'edge' ? lazyWorkerEnv(target.cloudflareConfig, mode, devCopy?.workerEnv) : undefined;
    // read up front because the runner reports anything a load hook throws as CoreImportFailed
    if (runsWorkerCode) await workerEnv?.();
    const conditions = runsWorkerCode ? WORKERD_CONDITIONS : NODE_CONDITIONS;
    const userPlugins = use === 'config' ? [] : use.vitePlugins.create();
    const config = mergeViteConfig(userCodeConfig(conditions, projectDir), {
        root: projectDir,
        mode,
        configFile: false,
        logLevel: 'error',
        clearScreen: false,
        // hmr: false still opens vite's websocket on 24678
        server: { middlewareMode: true, hmr: false, ws: false, watch: devCopy?.watch ?? null },
        // keeps vite from writing a dep cache into the project's node_modules/.vite
        optimizeDeps: { noDiscovery: true, include: [] },
        plugins: [...(workerEnv ? [edgeStandIns(workerEnv)] : []), userPlugins]
    });
    await using onFailure = new AsyncDisposableStack();
    const server = await openViteServer(onFailure, config);
    const runner = createServerModuleRunner(botEnvironment(server.environments), { hmr: false });
    onFailure.defer(() => runner.close());

    const loader = new ViteModuleLoader(server, runner);
    if (runsWorkerCode) await loader.bindEdgeEnv();

    onFailure.move();
    return loader;
}
