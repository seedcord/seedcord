import { dirname, isAbsolute, relative, resolve } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { resolveDefaultExport } from '@utils/resolveDefaultExport';

import type {
    ResolvedSeedcordBuildConfig,
    ResolvedSeedcordDevConfig,
    ResolvedTunnel,
    SeedcordBuildConfig,
    SeedcordDevConfig
} from './schema';
import type { ModuleLoader } from '@core/modules/ModuleLoader';
import type { ILogger } from '@seedcord/types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
    return value === undefined || typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function validateBuild(value: unknown): void {
    if (value === undefined) return;
    if (!isPlainObject(value)) throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidBuild);
    if (!isOptionalString(value.outDir)) throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidBuildOutDir);
    if (!isOptionalString(value.tsconfig)) throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidBuildTsconfig);
    if (!isOptionalString(value.bootstrap)) throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidBuildBootstrap);
}

function validateHmr(value: unknown): void {
    if (value === undefined) return;
    if (!isPlainObject(value)) throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidHmr);
    if (!isOptionalString(value.tsconfig)) throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidTsconfig);
    if (value.restart !== undefined && !isStringArray(value.restart)) {
        throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidHmrRestart);
    }
    if (value.rollback !== undefined && typeof value.rollback !== 'boolean') {
        throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidHmrRollback);
    }
}

function validateTunnel(value: unknown): void {
    if (value === undefined || typeof value === 'boolean') return;
    // discord only accepts an https interactions endpoint
    if (typeof value !== 'string' || URL.parse(value)?.protocol !== 'https:') {
        throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidTunnel);
    }
}

function resolveTunnel(value: boolean | string | undefined): ResolvedTunnel {
    if (value === false) return { mode: 'off' };
    if (typeof value === 'string') return { mode: 'url', url: value };
    return { mode: 'quick' };
}

function validateConfig(raw: unknown): asserts raw is SeedcordDevConfig {
    if (!isPlainObject(raw)) throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidExport);
    if (typeof raw.instance !== 'string' || raw.instance.length === 0) {
        throw new SeedcordError(SeedcordErrorCode.CliConfigMissingInstance);
    }
    if (typeof raw.entry !== 'string' || raw.entry.length === 0) {
        throw new SeedcordError(SeedcordErrorCode.CliConfigMissingEntry);
    }
    if (!isOptionalString(raw.root)) throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidRoot);
    validateTunnel(raw.tunnel);
    validateBuild(raw.build);
    validateHmr(raw.hmr);
}

export class ConfigLoader {
    constructor(
        private readonly modules: ModuleLoader,
        private readonly logger: ILogger
    ) {}

    public async load(configPath: string): Promise<ResolvedSeedcordDevConfig> {
        const loadedModule = await this.modules.importModule(configPath);
        const config: unknown = await Promise.resolve(resolveDefaultExport(loadedModule));
        validateConfig(config);

        const configDir = dirname(configPath);
        const root = resolve(configDir, config.root ?? '.');
        const instance = this.resolveWithinRoot(root, config.instance);
        const entry = this.resolveWithinRoot(root, config.entry);
        this.assertEntryWithinRoot(root, entry);
        const build = this.resolveBuildOptions(configDir, config.build);
        const tsconfig = config.hmr?.tsconfig ? resolve(root, config.hmr.tsconfig) : undefined;

        this.logger.debug(`Loaded configuration from ${configPath}`);
        this.logger.trace(`Resolved root: ${root}`);
        this.logger.trace(`Resolved instance: ${instance}`);
        this.logger.trace(`Resolved entry: ${entry}`);
        this.logger.trace(`Resolved build outDir: ${build.outDir}`);
        if (build.tsconfig) this.logger.trace(`Resolved build tsconfig: ${build.tsconfig}`);
        if (tsconfig) this.logger.trace(`Resolved dev tsconfig: ${tsconfig}`);
        this.logger.trace(`Resolved bootstrap: ${build.bootstrap}`);

        return {
            instance,
            root,
            configFile: configPath,
            entry,
            build,
            tsconfig,
            tunnel: resolveTunnel(config.tunnel),
            hmr: config.hmr
        } satisfies ResolvedSeedcordDevConfig;
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
