import { dirname, isAbsolute, relative, resolve } from 'node:path';

import { SeedcordError, SeedcordErrorCode } from '@seedcord/services';

import { resolveDefaultExport } from '@utils/resolveDefaultExport';

import type {
    ResolvedSeedcordBuildConfig,
    ResolvedSeedcordDevConfig,
    SeedcordBuildConfig,
    SeedcordDevConfig
} from './schema';
import type { ModuleLoader } from '@core/modules/ModuleLoader';
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
        const configDir = dirname(configPath);

        const root = resolve(configDir, config.root ?? '.');
        const instance = this.resolveWithinRoot(root, config.instance);
        const entry = this.resolveWithinRoot(root, config.entry);
        this.assertEntryWithinRoot(root, entry);
        const build = this.resolveBuildOptions(configDir, config.build);
        const tsconfig = config.tsconfig ? resolve(root, config.tsconfig) : undefined;
        const preventCtrlC = config.preventCtrlC ?? false;

        this.logger.info(`Loaded configuration from ${configPath}`);
        this.logger.debug(`Resolved root: ${root}`);
        this.logger.debug(`Resolved instance: ${instance}`);
        this.logger.debug(`Resolved entry: ${entry}`);
        this.logger.debug(`Resolved build outDir: ${build.outDir}`);
        if (build.tsconfig) this.logger.debug(`Resolved build tsconfig: ${build.tsconfig}`);
        if (tsconfig) this.logger.debug(`Resolved dev tsconfig: ${tsconfig}`);
        this.logger.debug(`Resolved bootstrap: ${build.bootstrap}`);

        return {
            instance,
            root,
            configFile: configPath,
            entry,
            build,
            tsconfig,
            preventCtrlC
        } satisfies ResolvedSeedcordDevConfig;
    }

    // eslint-disable-next-line complexity, max-statements
    private async unwrapConfig(raw: unknown): Promise<SeedcordDevConfig> {
        const resolved = await Promise.resolve(raw);
        if (!resolved || typeof resolved !== 'object') {
            throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidExport);
        }
        const cfg = resolved as Partial<SeedcordDevConfig>;
        if (!cfg.instance || typeof cfg.instance !== 'string') {
            throw new SeedcordError(SeedcordErrorCode.CliConfigMissingInstance);
        }

        if (!cfg.entry || typeof cfg.entry !== 'string') {
            throw new SeedcordError(SeedcordErrorCode.CliConfigMissingEntry);
        }

        if (typeof cfg.root !== 'undefined' && typeof cfg.root !== 'string') {
            throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidRoot);
        }

        if (typeof cfg.tsconfig !== 'undefined' && typeof cfg.tsconfig !== 'string') {
            throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidTsconfig);
        }

        if (typeof cfg.build !== 'undefined' && typeof cfg.build !== 'object') {
            throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidBuild);
        }

        if (cfg.build) {
            const { outDir, tsconfig, bootstrap } = cfg.build;
            if (typeof outDir !== 'undefined' && typeof outDir !== 'string') {
                throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidBuildOutDir);
            }

            if (typeof tsconfig !== 'undefined' && typeof tsconfig !== 'string') {
                throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidBuildTsconfig);
            }

            if (typeof bootstrap !== 'undefined' && typeof bootstrap !== 'string') {
                throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidBuildBootstrap);
            }
        }

        const normalized: SeedcordDevConfig = { instance: cfg.instance, entry: cfg.entry };
        if (typeof cfg.root === 'string') normalized.root = cfg.root;
        if (typeof cfg.tsconfig === 'string') normalized.tsconfig = cfg.tsconfig;
        if (cfg.build) normalized.build = cfg.build;
        if (typeof cfg.preventCtrlC === 'boolean') normalized.preventCtrlC = cfg.preventCtrlC;

        return normalized;
    }

    private resolveWithinRoot(root: string, target: string): string {
        if (isAbsolute(target)) return target;
        return resolve(root, target);
    }

    private assertEntryWithinRoot(root: string, entry: string): void {
        const relativePath = relative(root, entry);
        if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
            throw new SeedcordError(SeedcordErrorCode.CliConfigEntryOutsideRoot, [entry, root]);
        }
    }

    private resolveBuildOptions(
        configDir: string,
        build: SeedcordBuildConfig | undefined
    ): ResolvedSeedcordBuildConfig {
        const outDir = resolve(configDir, build?.outDir ?? 'dist');
        const bootstrapValue = build?.bootstrap;
        const bootstrap = bootstrapValue ? this.resolveBootstrap(outDir, bootstrapValue) : resolve(outDir, 'index.mjs');
        const tsconfig = build?.tsconfig ? resolve(configDir, build.tsconfig) : undefined;

        const resolvedBuild: ResolvedSeedcordBuildConfig = tsconfig
            ? { outDir, bootstrap, tsconfig }
            : { outDir, bootstrap };

        return resolvedBuild;
    }

    private resolveBootstrap(outDir: string, bootstrap: string): string {
        if (isAbsolute(bootstrap)) return bootstrap;
        return resolve(outDir, bootstrap);
    }
}
