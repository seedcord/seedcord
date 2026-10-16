import { existsSync } from 'node:fs';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import { BIND_ENV_ID } from './edgeStandIns';

import type { ModuleLoader } from './ModuleLoader';
import type { WorkerEnv } from './workerEnv';
import type { ModuleRunner } from 'vite/module-runner';

export class RunnerModuleLoader implements ModuleLoader {
    constructor(protected readonly runner: ModuleRunner) {}

    public async importModule<TModule = unknown>(path: string): Promise<TModule> {
        if (path.includes('#')) throw new SeedcordError(SeedcordErrorCode.CliPathHasHash, [path]);
        if (!existsSync(path)) throw new SeedcordError(SeedcordErrorCode.CliEntryNotFound, [path]);
        return this.load<TModule>(path, path);
    }

    public async bindEdgeEnv(workerEnv: WorkerEnv, cloudflareConfig: string): Promise<void> {
        await workerEnv.readConfig(this, cloudflareConfig);
        await this.load(BIND_ENV_ID, 'envapt');
    }

    protected async load<TModule>(id: string, shownAs: string): Promise<TModule> {
        try {
            return await this.runner.import<TModule>(id);
        } catch (error: unknown) {
            throw new SeedcordError(SeedcordErrorCode.CoreImportFailed, [shownAs, asError(error).message], {
                cause: error
            });
        }
    }
}
