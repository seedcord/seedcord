import { dirname, isAbsolute, resolve } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { isPlainObject } from '@seedcord/utils/internal';
import { isInside } from '@seedcord/utils/node/internal';

import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type {
    ResolvedSeedcordBuildConfig,
    ResolvedSeedcordDevConfig,
    ResolvedTunnel,
    ResolvedTypecheck,
    SeedcordBuildConfig,
    SeedcordDevConfig,
    SeedcordHmrConfig
} from './schema';
import type { ILogger } from '@seedcord/types';

function isOptionalString(value: unknown): boolean {
    return value === undefined || typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function invalidField(field: string, expected: string): SeedcordError {
    return new SeedcordError(SeedcordErrorCode.CliConfigInvalidField, [field, expected]);
}

function validateBuild(value: unknown): void {
    if (value === undefined) return;
    if (!isPlainObject(value)) throw invalidField('build', 'an object');
    if (!isOptionalString(value.outDir)) throw invalidField('build.outDir', 'a string');
    if (!isOptionalString(value.tsconfig)) throw invalidField('build.tsconfig', 'a string');
}

function validateTypecheck(value: unknown): void {
    if (value === undefined || typeof value === 'boolean') return;
    if (!isPlainObject(value)) throw invalidField('hmr.typecheck', 'a boolean or an object');
    if (!isOptionalString(value.tsconfig)) throw invalidField('hmr.typecheck.tsconfig', 'a string');
}

function validateHmr(value: unknown): void {
    if (value === undefined) return;
    if (!isPlainObject(value)) throw invalidField('hmr', 'an object');
    if (value.restart !== undefined && !isStringArray(value.restart)) {
        throw invalidField('hmr.restart', 'an array of strings');
    }
    if (value.rollback !== undefined && typeof value.rollback !== 'boolean') {
        throw invalidField('hmr.rollback', 'a boolean');
    }
    validateTypecheck(value.typecheck);
}

function validateTunnel(value: unknown): void {
    if (value === undefined || typeof value === 'boolean') return;
    // discord only accepts an https interactions endpoint
    if (typeof value !== 'string' || URL.parse(value)?.protocol !== 'https:') {
        throw invalidField('tunnel', 'a boolean or an https URL');
    }
}

function resolveTunnel(value: boolean | string | undefined): ResolvedTunnel {
    if (value === false) return { mode: 'off' };
    if (typeof value === 'string') return { mode: 'url', url: value };
    return { mode: 'quick' };
}

function resolveTypecheck(value: SeedcordHmrConfig['typecheck'], root: string): ResolvedTypecheck {
    if (value === undefined || value === false) return { enabled: false };
    if (value === true || value.tsconfig === undefined) return { enabled: true };

    return { enabled: true, tsconfig: resolve(root, value.tsconfig) };
}

function validateConfig(raw: unknown): asserts raw is SeedcordDevConfig {
    if (!isPlainObject(raw)) throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidExport);
    if (typeof raw.instance !== 'string' || raw.instance.length === 0) {
        throw new SeedcordError(SeedcordErrorCode.CliConfigMissingInstance);
    }
    if (typeof raw.entry !== 'string' || raw.entry.length === 0) {
        throw new SeedcordError(SeedcordErrorCode.CliConfigMissingEntry);
    }
    if (!isOptionalString(raw.root)) throw invalidField('root', 'a string');
    if (raw.idleAnimation !== undefined && typeof raw.idleAnimation !== 'boolean') {
        throw invalidField('idleAnimation', 'a boolean');
    }
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
        this.assertOutDirOutsideRoot(build.outDir, root);
        const typecheck = resolveTypecheck(config.hmr?.typecheck, root);

        this.logger.debug(`Loaded configuration from ${configPath}`);
        this.logger.trace(`Resolved root: ${root}`);
        this.logger.trace(`Resolved instance: ${instance}`);
        this.logger.trace(`Resolved entry: ${entry}`);
        this.logger.trace(`Resolved build outDir: ${build.outDir}`);
        if (build.tsconfig) this.logger.trace(`Resolved build tsconfig: ${build.tsconfig}`);
        if (typecheck.enabled) this.logger.trace(`Typecheck tsconfig: ${typecheck.tsconfig ?? 'nearest'}`);

        return {
            instance,
            root,
            configFile: configPath,
            entry,
            build,
            typecheck,
            idleAnimation: config.idleAnimation ?? true,
            tunnel: resolveTunnel(config.tunnel),
            hmr: config.hmr
        } satisfies ResolvedSeedcordDevConfig;
    }

    private resolveWithinRoot(root: string, target: string): string {
        if (isAbsolute(target)) return target;
        return resolve(root, target);
    }

    private assertEntryWithinRoot(root: string, entry: string): void {
        if (!isInside(root, entry)) throw new SeedcordError(SeedcordErrorCode.CliConfigEntryOutsideRoot, [entry, root]);
    }

    // seedcord build empties outDir before it writes
    private assertOutDirOutsideRoot(outDir: string, root: string): void {
        if (isInside(outDir, root))
            throw new SeedcordError(SeedcordErrorCode.CliConfigOutDirDeletesRoot, [outDir, root]);
    }

    private resolveBuildOptions(
        configDir: string,
        build: SeedcordBuildConfig | undefined
    ): ResolvedSeedcordBuildConfig {
        const outDir = resolve(configDir, build?.outDir ?? 'dist');
        const tsconfig = build?.tsconfig ? resolve(configDir, build.tsconfig) : undefined;

        return tsconfig ? { outDir, tsconfig } : { outDir };
    }
}
