import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { ResolvedSeedcordDevConfig } from './schema';

export function projectTsconfig({ configFile, build }: ResolvedSeedcordDevConfig): string | undefined {
    if (build.tsconfig) {
        if (!existsSync(build.tsconfig)) {
            throw new SeedcordError(SeedcordErrorCode.CliBuildTsconfigNotFound, [build.tsconfig]);
        }
        return build.tsconfig;
    }

    const beside = join(dirname(configFile), 'tsconfig.json');
    return existsSync(beside) ? beside : undefined;
}
