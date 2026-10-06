import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { SeedcordBrand, type Brandable, type SeedcordInstance } from '@seedcord/types/internal';

import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import type { ModuleLoader } from './ModuleLoader';

export function toSeedcordInstance(candidate: unknown, instancePath: string): SeedcordInstance {
    if (typeof candidate === 'object' && candidate !== null && (candidate as Brandable)[SeedcordBrand] === true) {
        return candidate as SeedcordInstance;
    }
    throw new SeedcordError(SeedcordErrorCode.CliInstanceInvalid, [instancePath]);
}

export async function importInstance(modules: ModuleLoader, instancePath: string): Promise<SeedcordInstance> {
    const module = await modules.importModule(instancePath);
    return toSeedcordInstance(await resolveDefaultExport(module), instancePath);
}
