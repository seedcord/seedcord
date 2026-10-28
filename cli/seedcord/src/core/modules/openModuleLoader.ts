import { createServerModuleRunner } from 'vite';

import { botEnvironment } from './botEnvironment';
import { edgeStandIns } from './edgeStandIns';
import { envBootstrap } from './envBootstrap';
import { openViteServer } from './openViteServer';
import { RunnerModuleLoader } from './RunnerModuleLoader';
import { mergeViteConfig, NODE_CONDITIONS, WORKERD_CONDITIONS, userCodeConfig } from './userCodeConfig';
import { WorkerEnv } from './workerEnv';

import type { BuildTarget } from '#core/config/detectTarget';
import type { LoaderUse, ModuleLoader } from './ModuleLoader';
import type { ServerOptions } from 'vite';

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
): Promise<ModuleLoader & AsyncDisposable> {
    const runsWorkerCode = target.kind === 'edge' && use !== 'config';
    const loadWorkerEnv =
        target.kind === 'edge' ? lazyWorkerEnv(target.cloudflareConfig, mode, devCopy?.workerEnv) : undefined;
    // read up front because the runner reports anything a load hook throws as CoreImportFailed
    const workerEnv = runsWorkerCode && loadWorkerEnv ? await loadWorkerEnv() : undefined;
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
        plugins: [
            envBootstrap(runsWorkerCode ? { runtime: 'worker' } : { runtime: 'node', directory: projectDir }),
            ...(loadWorkerEnv ? [edgeStandIns(loadWorkerEnv)] : []),
            userPlugins
        ]
    });
    await using onFailure = new AsyncDisposableStack();
    workerEnv?.bindToCli(onFailure);
    const server = await openViteServer(onFailure, config);
    const runner = createServerModuleRunner(botEnvironment(server.environments), { hmr: false });
    const loader = onFailure.use(new RunnerModuleLoader(runner));
    await loader.bindEnv();

    const resources = onFailure.move();
    return {
        importModule: loader.importModule.bind(loader),
        importPackage: loader.importPackage.bind(loader),
        evaluated: loader.evaluated.bind(loader),
        [Symbol.asyncDispose]: () => resources.disposeAsync()
    };
}
