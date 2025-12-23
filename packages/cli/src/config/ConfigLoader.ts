import { dirname, resolve } from 'node:path';

import { SeedcordError, SeedcordErrorCode } from '@seedcord/services';

import { resolveDefaultExport } from '../utils/resolveDefaultExport';

import type { ResolvedSeedcordDevConfig, SeedcordDevConfig } from './schema';
import type { ModuleLoader } from '../modules/ModuleLoader';
import type { ILogger } from '@seedcord/types';

export class ConfigLoader {
    constructor(
        private readonly modules: ModuleLoader,
        private readonly logger: ILogger
    ) {}

    public async load(configPath: string): Promise<ResolvedSeedcordDevConfig> {
        const loadedModule = await this.modules.importModule(configPath);
        const rawExport = resolveDefaultExport(loadedModule);
        const config = await this.unwrapConfig(rawExport);

        const root = resolve(dirname(configPath), config.root ?? '.');
        const instance = resolve(root, config.instance);

        this.logger.info(`Loaded configuration from ${configPath}`);
        this.logger.debug(`Resolved root: ${root}`);
        this.logger.debug(`Resolved instance: ${instance}`);

        return { instance, root, configFile: configPath } satisfies ResolvedSeedcordDevConfig;
    }

    private async unwrapConfig(raw: unknown): Promise<SeedcordDevConfig> {
        const resolved = await Promise.resolve(raw);
        if (!resolved || typeof resolved !== 'object') {
            throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidExport);
        }
        const cfg = resolved as Partial<SeedcordDevConfig>;
        if (!cfg.instance || typeof cfg.instance !== 'string') {
            throw new SeedcordError(SeedcordErrorCode.CliConfigMissingInstance);
        }

        if (typeof cfg.root !== 'undefined' && typeof cfg.root !== 'string') {
            throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidRoot);
        }

        const normalized: SeedcordDevConfig = { instance: cfg.instance };
        if (typeof cfg.root === 'string') normalized.root = cfg.root;

        return normalized;
    }
}
