import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { ProjectFiles } from './ProjectFiles';

export class Project implements AsyncDisposable {
    public readonly configDir: string;

    constructor(
        public readonly config: ResolvedSeedcordConfig,
        public readonly files: ProjectFiles,
        private readonly loader: ModuleLoader & AsyncDisposable,
        private readonly configLoader?: AsyncDisposable
    ) {
        this.configDir = dirname(config.configFile);
    }

    public get modules(): ModuleLoader {
        return this.loader;
    }

    public tsconfig(): string | undefined {
        const { tsconfig } = this.config.build;
        if (tsconfig) {
            if (!existsSync(tsconfig))
                throw new SeedcordError(SeedcordErrorCode.CliTsconfigNotFound, [this.configDir, tsconfig]);
            return tsconfig;
        }

        const beside = join(this.configDir, 'tsconfig.json');
        return existsSync(beside) ? beside : undefined;
    }

    public async [Symbol.asyncDispose](): Promise<void> {
        try {
            await this.loader[Symbol.asyncDispose]();
        } finally {
            await this.configLoader?.[Symbol.asyncDispose]();
        }
    }
}
