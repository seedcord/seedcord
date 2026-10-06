import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { SeedcordBrand, type Brandable, type SeedcordInstance } from '@seedcord/types/internal';

import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import type { ModuleLoader } from './ModuleLoader';

function isSeedcordInstance(candidate: unknown): candidate is SeedcordInstance {
    return typeof candidate === 'object' && candidate !== null && (candidate as Brandable)[SeedcordBrand] === true;
}

export async function importInstance(modules: ModuleLoader, instancePath: string): Promise<SeedcordInstance> {
    const instance = resolveDefaultExport(await modules.importModule(instancePath));
    if (!isSeedcordInstance(instance)) throw new SeedcordError(SeedcordErrorCode.CliInstanceInvalid);
    return instance;
}
