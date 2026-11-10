import { existsSync } from 'node:fs';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import {
    HOST_CONTRACT,
    HostAugmentTarget,
    HostContract,
    SeedcordBrand,
    type Brandable,
    type SeedcordInstance
} from '@seedcord/types/internal';

import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import type { ModuleLoader } from './ModuleLoader';

export function toSeedcordInstance(candidate: unknown, instancePath: string): SeedcordInstance {
    // justified: every key is optional, and an older transport is missing the newer ones
    const host = (typeof candidate === 'object' ? candidate : null) as Partial<SeedcordInstance & Brandable> | null;
    if (host?.[SeedcordBrand] !== true) {
        throw new SeedcordError(SeedcordErrorCode.CliInstanceInvalid, [instancePath]);
    }
    if (host[HostContract] !== HOST_CONTRACT) {
        throw new SeedcordError(SeedcordErrorCode.CliHostContractMismatch, [
            host[HostAugmentTarget] ?? 'your seedcord transport package'
        ]);
    }
    // justified: every SeedcordInstance has the brand and the matching contract
    return host as SeedcordInstance;
}

export async function instanceModule(modules: ModuleLoader, instancePath: string): Promise<unknown> {
    if (!existsSync(instancePath))
        throw new SeedcordError(SeedcordErrorCode.CliFileNotFound, [instancePath, 'instance']);
    return modules.importModule(instancePath);
}

export async function importInstance(modules: ModuleLoader, instancePath: string): Promise<SeedcordInstance> {
    return toSeedcordInstance(await resolveDefaultExport(await instanceModule(modules, instancePath)), instancePath);
}
