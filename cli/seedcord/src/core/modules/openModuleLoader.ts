import { existsSync } from 'node:fs';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { createServer, createServerModuleRunner, mergeConfig } from 'vite';

import { BIND_ENV_ID, edgeStandIns } from './edgeStandIns';
import { seedcordDependents } from './seedcordDependents';
import { NODE_CONDITIONS, WORKERD_CONDITIONS, userCodeConfig } from './userCodeConfig';

import type { BuildTarget } from '#core/config/detectTarget';
import type { ModuleLoader } from './ModuleLoader';
import type { ViteDevServer } from 'vite';
import type { ModuleRunner } from 'vite/module-runner';

class ViteModuleLoader implements ModuleLoader, AsyncDisposable {
    constructor(
        private readonly server: ViteDevServer,
        private readonly runner: ModuleRunner
    ) {}

    public async importModule<TModule = unknown>(path: string): Promise<TModule> {
        if (path.includes('#')) throw new SeedcordError(SeedcordErrorCode.CliPathHasHash, [path]);
        if (!existsSync(path)) throw new SeedcordError(SeedcordErrorCode.CliEntryNotFound, [path]);

        try {
            return await this.runner.import<TModule>(path);
        } catch (error: unknown) {
            const reason = Error.isError(error) ? error.message : String(error);
            throw new SeedcordError(SeedcordErrorCode.CliImportFailed, [path, reason], { cause: error });
        }
    }

    public async importStandIn(id: string): Promise<void> {
        await this.runner.import(id);
    }

    public async [Symbol.asyncDispose](): Promise<void> {
        await this.runner.close();
        await this.server.close();
    }
}

export async function openModuleLoader(
    projectDir: string,
    target: BuildTarget
): Promise<ModuleLoader & AsyncDisposable> {
    const isEdge = target.kind === 'edge';
    const config = mergeConfig(userCodeConfig(isEdge ? WORKERD_CONDITIONS : NODE_CONDITIONS), {
        root: projectDir,
        configFile: false,
        logLevel: 'error',
        clearScreen: false,
        server: { middlewareMode: true, hmr: false, watch: null },
        ssr: { noExternal: seedcordDependents(projectDir) },
        plugins: isEdge ? [edgeStandIns()] : []
    });
    await using onFailure = new AsyncDisposableStack();
    const server = await createServer(config);
    const loader = onFailure.use(
        new ViteModuleLoader(server, createServerModuleRunner(server.environments.ssr, { hmr: false }))
    );
    if (isEdge) await loader.importStandIn(BIND_ENV_ID);

    onFailure.move();
    return loader;
}
