import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { ResolvedSeedcordDevConfig } from '@core/config/schema';
import type { ILogger } from '@seedcord/types';

export class BootstrapWriter {
    constructor(private readonly logger: ILogger) {}

    public async write(config: ResolvedSeedcordDevConfig, emittedEntry: string): Promise<void> {
        const target = config.build.bootstrap;
        const relativeImport = this.formatImportPath(relative(dirname(target), emittedEntry));
        const contents = `import '${relativeImport}';\n`;

        try {
            await mkdir(dirname(target), { recursive: true });
            await writeFile(target, contents, 'utf8');
        } catch (error: unknown) {
            const reason = error instanceof Error ? error.message : 'Unknown error';
            throw new SeedcordError(SeedcordErrorCode.CliBootstrapWriteFailed, [target, reason]);
        }

        this.logger.info(`Bootstrap file created at ${target}`);
    }

    private formatImportPath(fragment: string): string {
        const normalized = fragment.replaceAll('\\', '/');
        return normalized.startsWith('.') ? normalized : `./${normalized}`;
    }
}
