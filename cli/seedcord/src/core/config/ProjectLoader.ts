import { dirname, resolve } from 'node:path';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError, SeedcordTypeError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { isPlainObject, isStringArray } from '@seedcord/utils/internal';
import { isInside } from '@seedcord/utils/node/internal';

import { Project } from '#core/project/Project';
import { viteMode } from '#core/viteMode';
import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import { assertNoHashPaths } from './assertNoHashPaths';
import { assertTargetMatchesTsconfig } from './assertTargetMatchesTsconfig';
import { detectTarget } from './detectTarget';
import { locateConfig } from './locateConfig';

import type { ModuleLoader, OpenModules } from '#core/modules/ModuleLoader';
import type { DefaultMode } from '#core/viteMode';
import type { BuildTarget } from './detectTarget';
import type {
    ResolvedSeedcordBuildConfig,
    ResolvedSeedcordConfig,
    ResolvedTarget,
    ResolvedTunnel,
    ResolvedTypecheck,
    SeedcordBuildConfig,
    SeedcordConfig,
    SeedcordHmrConfig,
    SeedcordServerConfig
} from './schema';

// wrangler dev's default port
const EDGE_DEV_PORT = 8787;

function isOptionalString(value: unknown): boolean {
    return value === undefined || typeof value === 'string';
}

function invalidField(field: string, expected: string): SeedcordTypeError {
    return new SeedcordTypeError(SeedcordErrorCode.CliConfigInvalidField, [field, expected]);
}

function unusedField(field: string, configFile: string, why: string): SeedcordTypeError {
    return new SeedcordTypeError(SeedcordErrorCode.CliConfigFieldUnused, [field, configFile, why]);
}

function* buildProblems(value: unknown, target: BuildTarget, configFile: string): Generator<SeedcordTypeError> {
    if (value === undefined) return;
    if (!isPlainObject(value)) {
        yield invalidField('build', 'an object');
        return;
    }
    if (target.kind === 'edge' && value.outDir !== undefined) {
        const why = `An edge bot can't set it, because ${paint.bold('@cloudflare/vite-plugin')} writes the worker to ${paint.path('.cloudflare/output')}, where ${paint.bold('cf deploy --prebuilt')} reads it.`;
        yield unusedField('build.outDir', configFile, why);
    } else if (!isOptionalString(value.outDir)) {
        yield invalidField('build.outDir', 'a string');
    }
    if (!isOptionalString(value.tsconfig)) yield invalidField('build.tsconfig', 'a string');
}

function* typecheckProblems(value: unknown): Generator<SeedcordTypeError> {
    if (value === undefined || typeof value === 'boolean') return;
    if (!isPlainObject(value)) {
        yield invalidField('hmr.typecheck', 'a boolean or an object');
        return;
    }
    if (!isOptionalString(value.tsconfig)) yield invalidField('hmr.typecheck.tsconfig', 'a string');
}

function* hmrProblems(value: unknown): Generator<SeedcordTypeError> {
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

function* tunnelProblems(value: unknown): Generator<SeedcordTypeError> {
    if (value === undefined || typeof value === 'boolean') return;
    // discord only accepts an https interactions endpoint
    if (typeof value !== 'string' || URL.parse(value)?.protocol !== 'https:') {
        yield invalidField('tunnel', 'a boolean or an https URL');
    }
}

function isNonEmptyString(value: unknown): boolean {
    return typeof value === 'string' && value.length > 0;
}

function* entryProblems(entry: unknown, target: BuildTarget, configFile: string): Generator<SeedcordTypeError> {
    if (target.kind === 'server') {
        if (!isNonEmptyString(entry)) yield invalidField('entry', 'a string that points to your startup script');
    } else if (entry !== undefined) {
        const why = `${paint.path(target.cloudflareConfig)} makes this an edge bot, which has no entry because Cloudflare calls the default export of ${paint.bold('instance')}.`;
        yield unusedField('entry', configFile, why);
    }
}

const MAX_PORT = 65_535;
const PORT_RANGE = `an integer from 0 to ${MAX_PORT}`;

function* portProblems(
    port: unknown,
    target: BuildTarget,
    configFile: string
): Generator<SeedcordTypeError | SeedcordRangeError> {
    if (port === undefined) return;
    if (target.kind === 'server') {
        const why = `Only an edge bot reads it. An http bot on node listens on the ${paint.bold('port')} it passes to ${paint.bold('new Seedcord({ ... })')}.`;
        yield unusedField('port', configFile, why);
    } else if (typeof port !== 'number' || !Number.isSafeInteger(port)) {
        yield invalidField('port', PORT_RANGE);
    } else if (port < 0 || port > MAX_PORT) {
        yield new SeedcordRangeError(SeedcordErrorCode.CliConfigInvalidField, ['port', PORT_RANGE]);
    }
}

function* configProblems(
    raw: Record<string, unknown>,
    target: BuildTarget,
    configFile: string
): Generator<SeedcordTypeError | SeedcordRangeError> {
    if (!isNonEmptyString(raw.instance))
        yield invalidField('instance', 'a string that points to the file that default exports your bot');
    yield* entryProblems(raw.entry, target, configFile);
    yield* portProblems(raw.port, target, configFile);
    if (!isOptionalString(raw.root)) yield invalidField('root', 'a string');
    if (raw.idleAnimation !== undefined && typeof raw.idleAnimation !== 'boolean') {
        yield invalidField('idleAnimation', 'a boolean');
    }
    yield* tunnelProblems(raw.tunnel);
    yield* buildProblems(raw.build, target, configFile);
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

function validateConfig(raw: unknown, target: BuildTarget, configFile: string): asserts raw is SeedcordConfig {
    if (!isPlainObject(raw)) throw new SeedcordTypeError(SeedcordErrorCode.CliConfigInvalidExport);
    throwSingleOrAggregate([...configProblems(raw, target, configFile)], SeedcordErrorCode.CliProblems);
}

export class ProjectLoader {
    constructor(
        private readonly openModules: OpenModules,
        private readonly defaultMode: DefaultMode = 'development'
    ) {}

    public async open(projectDir = process.cwd()): Promise<Project> {
        const mode = viteMode(this.defaultMode);
        const configPath = locateConfig(projectDir);
        const configDir = dirname(configPath);
        const target = detectTarget(configDir);
        await using onFailure = new AsyncDisposableStack();
        const modules = onFailure.use(await this.openModules(configDir, target, mode));
        const project = new Project(await this.readConfig(modules, configPath, target, mode), modules);
        await assertNoHashPaths(project);
        await assertTargetMatchesTsconfig(project);

        onFailure.move();
        return project;
    }

    private async readConfig(
        modules: ModuleLoader,
        configPath: string,
        target: BuildTarget,
        mode: string
    ): Promise<ResolvedSeedcordConfig> {
        const loadedModule = await modules.importModule(configPath);
        const config: unknown = await Promise.resolve(resolveDefaultExport(loadedModule));
        validateConfig(config, target, configPath);

        const configDir = dirname(configPath);
        const root = resolve(configDir, config.root ?? '.');
        const instance = resolve(root, config.instance);
        const build = this.resolveBuildOptions(configDir, config.build);
        const typecheck = resolveTypecheck(config.hmr?.typecheck, root);

        return {
            instance,
            root,
            configFile: configPath,
            target: this.resolveTarget(root, configDir, target, config),
            build,
            typecheck,
            idleAnimation: config.idleAnimation ?? true,
            mode,
            tunnel: resolveTunnel(config.tunnel),
            hmr: config.hmr
        } satisfies ResolvedSeedcordConfig;
    }

    private resolveTarget(
        root: string,
        configDir: string,
        target: BuildTarget,
        config: SeedcordConfig
    ): ResolvedTarget {
        if (target.kind === 'edge') return { ...target, port: config.port ?? EDGE_DEV_PORT };

        // justified: entryProblems already required entry on a server target
        const server = config as SeedcordServerConfig;
        const entry = resolve(root, server.entry);
        if (!isInside(root, entry)) {
            throw new SeedcordTypeError(SeedcordErrorCode.CorePathOutsideRoot, [entry, root]);
        }
        return { ...target, entry, outDir: resolve(configDir, server.build?.outDir ?? 'dist') };
    }

    private resolveBuildOptions(
        configDir: string,
        build: SeedcordBuildConfig | undefined
    ): ResolvedSeedcordBuildConfig {
        return build?.tsconfig ? { tsconfig: resolve(configDir, build.tsconfig) } : {};
    }
}
