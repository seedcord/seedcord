import { dirname, isAbsolute, resolve } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { isPlainObject } from '@seedcord/utils/internal';
import { isInside } from '@seedcord/utils/node/internal';

import { Project } from '#core/project/Project';
import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import { assertNoHashPaths } from './assertNoHashPaths';
import { assertTargetMatchesTsconfig } from './assertTargetMatchesTsconfig';
import { detectTarget } from './detectTarget';
import { locateConfig } from './locateConfig';

import type { ModuleLoader, OpenModules } from '#core/modules/ModuleLoader';
import type { BuildTarget } from './detectTarget';
import type {
    ResolvedSeedcordBuildConfig,
    ResolvedSeedcordDevConfig,
    ResolvedTarget,
    ResolvedTunnel,
    ResolvedTypecheck,
    SeedcordBuildConfig,
    SeedcordConfig,
    SeedcordDevConfig,
    SeedcordHmrConfig
} from './schema';

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

function* entryProblems(entry: unknown, target: BuildTarget, configFile: string): Generator<SeedcordError> {
    if (target.kind === 'node' && !isNonEmptyString(entry)) {
        yield new SeedcordError(SeedcordErrorCode.CliConfigMissingEntry);
    }
    if (target.kind === 'edge' && entry !== undefined) {
        yield new SeedcordError(SeedcordErrorCode.CliConfigEntryOnEdge, [configFile, target.wranglerConfig]);
    }
}

function* configProblems(
    raw: Record<string, unknown>,
    target: BuildTarget,
    configFile: string
): Generator<SeedcordError> {
    if (!isNonEmptyString(raw.instance)) yield new SeedcordError(SeedcordErrorCode.CliConfigMissingInstance);
    yield* entryProblems(raw.entry, target, configFile);
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

function validateConfig(
    raw: unknown,
    target: BuildTarget,
    configFile: string
): asserts raw is SeedcordConfig | SeedcordDevConfig {
    if (!isPlainObject(raw)) throw new SeedcordError(SeedcordErrorCode.CliConfigInvalidExport);
    throwSingleOrAggregate([...configProblems(raw, target, configFile)], SeedcordErrorCode.CliConfigProblems);
}

export class ProjectLoader {
    constructor(private readonly openModules: OpenModules) {}

    public async open(projectDir = process.cwd()): Promise<Project> {
        const configPath = locateConfig(projectDir);
        const configDir = dirname(configPath);
        const target = detectTarget(configDir);
        await using onFailure = new AsyncDisposableStack();
        const modules = onFailure.use(await this.openModules(configDir, target));
        const project = new Project(await this.readConfig(modules, configPath, target), modules);
        await assertNoHashPaths(project);
        await assertTargetMatchesTsconfig(project);

        onFailure.move();
        return project;
    }

    private async readConfig(
        modules: ModuleLoader,
        configPath: string,
        target: BuildTarget
    ): Promise<ResolvedSeedcordDevConfig> {
        const loadedModule = await modules.importModule(configPath);
        const config: unknown = await Promise.resolve(resolveDefaultExport(loadedModule));
        validateConfig(config, target, configPath);

        const configDir = dirname(configPath);
        const root = resolve(configDir, config.root ?? '.');
        const instance = this.resolveWithinRoot(root, config.instance);
        const build = this.resolveBuildOptions(configDir, config.build);
        const typecheck = resolveTypecheck(config.hmr?.typecheck, root);

        return {
            instance,
            root,
            configFile: configPath,
            target: this.resolveTarget(root, target, config),
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

    private resolveTarget(
        root: string,
        target: BuildTarget,
        config: SeedcordConfig | SeedcordDevConfig
    ): ResolvedTarget {
        if (target.kind === 'edge') return target;
        if (!('entry' in config)) throw new SeedcordError(SeedcordErrorCode.CliConfigMissingEntry);

        const resolved = this.resolveWithinRoot(root, config.entry);
        if (!isInside(root, resolved)) {
            throw new SeedcordError(SeedcordErrorCode.CliConfigEntryOutsideRoot, [resolved, root]);
        }
        return { ...target, entry: resolved };
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
