import { SeedcordError, SeedcordErrorCode } from '@seedcord/services';

import { resolveDefaultExport } from '../utils/resolveDefaultExport';

import type { ModuleLoader } from '../modules/ModuleLoader';
import type { ILogger } from '@seedcord/types';

type MaybePromise<TValue> = TValue | Promise<TValue>;

interface SeedcordLike {
    start: () => MaybePromise<unknown>;
}

export class SeedcordInstanceLoader {
    constructor(
        private readonly modules: ModuleLoader,
        private readonly logger: ILogger
    ) {}

    public async load(instancePath: string): Promise<SeedcordLike> {
        const loadedModule = await this.modules.importModule(instancePath);
        const exported = resolveDefaultExport(loadedModule);
        const instance = await Promise.resolve(exported);

        if (!this.isSeedcordLike(instance)) {
            throw new SeedcordError(SeedcordErrorCode.CliInstanceInvalid);
        }

        this.logger.info(`Loaded Seedcord instance from ${instancePath}`);
        return instance;
    }

    private isSeedcordLike(candidate: unknown): candidate is SeedcordLike {
        return Boolean(candidate) && typeof (candidate as SeedcordLike).start === 'function';
    }
}
