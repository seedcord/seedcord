import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { SEEDCORD_CONFIG_FILENAMES } from './schema';

import type { ILogger } from '@seedcord/types';

export class ConfigLocator {
    constructor(private readonly logger: ILogger) {}

    public locate(baseDir = process.cwd()): string {
        const normalizedBase = resolve(baseDir);
        for (const candidate of SEEDCORD_CONFIG_FILENAMES) {
            const fullPath = join(normalizedBase, candidate);
            if (existsSync(fullPath)) {
                this.logger.trace(`Found config at ${fullPath}`);
                return fullPath;
            }
        }

        throw new SeedcordError(SeedcordErrorCode.CliConfigNotFound, [normalizedBase, SEEDCORD_CONFIG_FILENAMES]);
    }
}
