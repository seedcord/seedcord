import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { ProjectFiles } from './ProjectFiles';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';

export class Project implements AsyncDisposable {
    public readonly configDir: string;
    public readonly files: ProjectFiles;

    constructor(
        public readonly config: ResolvedSeedcordConfig,
        private readonly loader: ModuleLoader & AsyncDisposable
    ) {
        this.configDir = dirname(config.configFile);
        this.files = new ProjectFiles(config.root, config.build.outDir, this.configDir);
    }

    public get modules(): ModuleLoader {
        return this.loader;
    }

    public tsconfig(): string | undefined {
        const { tsconfig } = this.config.build;
        if (tsconfig) {
            if (!existsSync(tsconfig)) throw new SeedcordError(SeedcordErrorCode.CliBuildTsconfigNotFound, [tsconfig]);
            return tsconfig;
        }

        const beside = join(this.configDir, 'tsconfig.json');
        return existsSync(beside) ? beside : undefined;
    }

    public async [Symbol.asyncDispose](): Promise<void> {
        await this.loader[Symbol.asyncDispose]();
    }
}
