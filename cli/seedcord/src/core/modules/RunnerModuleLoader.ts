import { existsSync } from 'node:fs';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import type { ModuleLoader } from './ModuleLoader';
import type { ModuleRunner } from 'vite/module-runner';

export class RunnerModuleLoader implements ModuleLoader {
    constructor(protected readonly runner: ModuleRunner) {}

    public async importModule<TModule = unknown>(path: string): Promise<TModule> {
        if (path.includes('#')) throw new SeedcordError(SeedcordErrorCode.CliPathHasHash, [path]);
        if (!existsSync(path)) throw new SeedcordError(SeedcordErrorCode.CliEntryNotFound, [path]);
        return this.load<TModule>(path, path);
    }

    protected async load<TModule>(id: string, shownAs: string): Promise<TModule> {
        try {
            return await this.runner.import<TModule>(id);
        } catch (error: unknown) {
            throw new SeedcordError(SeedcordErrorCode.CliImportFailed, [shownAs, asError(error).message], {
                cause: error
            });
        }
    }
}
