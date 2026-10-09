import { existsSync } from 'node:fs';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { createServer, createServerModuleRunner, mergeConfig } from 'vite';

import { seedcordDependents } from './seedcordDependents';
import { userCodeConfig } from './userCodeConfig';

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

    public async [Symbol.asyncDispose](): Promise<void> {
        await this.runner.close();
        await this.server.close();
    }
}

export async function openModuleLoader(projectDir: string): Promise<ModuleLoader & AsyncDisposable> {
    // vite writes resolved options back into the config object it receives
    const config = mergeConfig(structuredClone(userCodeConfig), {
        root: projectDir,
        configFile: false,
        logLevel: 'error',
        clearScreen: false,
        server: { middlewareMode: true, hmr: false, watch: null },
        ssr: { noExternal: seedcordDependents(projectDir) }
    });
    const server = await createServer(config);

    return new ViteModuleLoader(server, createServerModuleRunner(server.environments.ssr, { hmr: false }));
}
