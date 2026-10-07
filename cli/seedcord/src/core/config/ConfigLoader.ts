import { dirname, isAbsolute, resolve } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, throwSingleOrAggregate } from '@seedcord/errors/internal';
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

function* buildProblems(value: unknown): Generator<SeedcordError> {
    if (value === undefined) return;
    if (!isPlainObject(value)) {
        yield invalidField('build', 'an object');
        return;
    }
    if (!isOptionalString(value.outDir)) yield invalidField('build.outDir', 'a string');
    if (!isOptionalString(value.tsconfig)) yield invalidField('build.tsconfig', 'a string');
}

function* typecheckProblems(value: unknown): Generator<SeedcordError> {
    if (value === undefined || typeof value === 'boolean') return;
    if (!isPlainObject(value)) {
        yield invalidField('hmr.typecheck', 'a boolean or an object');
        return;
    }
    if (!isOptionalString(value.tsconfig)) yield invalidField('hmr.typecheck.tsconfig', 'a string');
}

function* hmrProblems(value: unknown): Generator<SeedcordError> {
    if (value === undefined) return;
    if (!isPlainObject(value)) {
        yield invalidField('hmr', 'an object');
        return;
    }
    if (value.restart !== undefined && !isStringArray(value.restart)) {
        yield invalidField('hmr.restart', 'an array of strings');
    }
    if (value.rollback !== undefined && typeof value.rollback !== 'boolean') {
        yield invalidField('hmr.rollback', 'a boolean');
    }
    yield* typecheckProblems(value.typecheck);
}

function* tunnelProblems(value: unknown): Generator<SeedcordError> {
    if (value === undefined || typeof value === 'boolean') return;
    // discord only accepts an https interactions endpoint
    if (typeof value !== 'string' || URL.parse(value)?.protocol !== 'https:') {
        yield invalidField('tunnel', 'a boolean or an https URL');
    }
}

function isNonEmptyString(value: unknown): boolean {
    return typeof value === 'string' && value.length > 0;
}

function* configProblems(raw: Record<string, unknown>): Generator<SeedcordError> {
    if (!isNonEmptyString(raw.instance)) yield new SeedcordError(SeedcordErrorCode.CliConfigMissingInstance);
    if (!isNonEmptyString(raw.entry)) yield new SeedcordError(SeedcordErrorCode.CliConfigMissingEntry);
    if (!isOptionalString(raw.root)) yield invalidField('root', 'a string');
    if (raw.idleAnimation !== undefined && typeof raw.idleAnimation !== 'boolean') {
        yield invalidField('idleAnimation', 'a boolean');
    }
    yield* tunnelProblems(raw.tunnel);
    yield* buildProblems(raw.build);
    yield* hmrProblems(raw.hmr);
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
    throwSingleOrAggregate([...configProblems(raw)], SeedcordErrorCode.CliConfigProblems);
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

    private resolveBuildOptions(
        configDir: string,
        build: SeedcordBuildConfig | undefined
    ): ResolvedSeedcordBuildConfig {
        const outDir = resolve(configDir, build?.outDir ?? 'dist');
        const tsconfig = build?.tsconfig ? resolve(configDir, build.tsconfig) : undefined;

        return tsconfig ? { outDir, tsconfig } : { outDir };
    }
}
