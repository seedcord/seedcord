import { dirname, resolve } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { isInside } from '@seedcord/utils/node/internal';

import { Project } from '#core/project/Project';
import { viteMode } from '#core/viteMode';
import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import { assertNoHashPaths } from './assertNoHashPaths';
import { assertTargetMatchesTsconfig } from './assertTargetMatchesTsconfig';
import { ConfigValidator } from './ConfigValidator';
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

export class ProjectLoader {
    constructor(
        private readonly openModules: OpenModules,
        private readonly defaultMode: DefaultMode = 'development'
    ) {}

    public async open(projectDir = process.cwd()): Promise<Project> {
        const mode = viteMode(this.defaultMode);
        const configPath = locateConfig(projectDir);
        const configDir = dirname(configPath);
        const target = await detectTarget(configDir, mode);
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
        const validator: ConfigValidator = new ConfigValidator(target, configPath);
        validator.validate(config);

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

        // justified: ConfigValidator already required entry on a server target
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
