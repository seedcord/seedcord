import { dirname } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { isInside } from '@seedcord/utils/internal';

import { PackageManifest } from '#core/modules/PackageManifest';

export function assertProjectInstall(projectDir: string, cliDir: string): void {
    const manifest = PackageManifest.findInstalled('seedcord', projectDir);
    if (manifest === undefined) {
        throw new SeedcordError(SeedcordErrorCode.CliDependencyMissing, [
            ['seedcord'],
            projectDir,
            'The CLI and the bot must load the same seedcord packages.'
        ]);
    }

    const projectInstall = dirname(manifest);
    if (!isInside(projectInstall, cliDir)) {
        throw new SeedcordError(SeedcordErrorCode.CliNotProjectInstall, [cliDir, projectInstall]);
    }
}
