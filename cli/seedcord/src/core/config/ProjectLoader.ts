import { dirname, resolve } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { isPlainObject } from '@seedcord/utils/internal';
import { isInside } from '@seedcord/utils/node/internal';
import { Envapter } from 'envapt';

import { Project } from '#core/project/Project';
import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import { assertNoHashPaths } from './assertNoHashPaths';
import { assertTargetMatchesTsconfig } from './assertTargetMatchesTsconfig';
import { ConfigValidator } from './ConfigValidator';
import { detectTarget } from './detectTarget';
import { locateConfig } from './locateConfig';
import { flattenVitePlugins, isVitePlugin, rethrowVitePluginError, wrapVitePlugins } from './vitePlugins';

import type { ModuleLoader, OpenModules } from '#core/modules/ModuleLoader';
import type { DefaultMode, ShellMode } from '#core/viteMode';
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

// the node http Seedcord's default port
const EDGE_DEV_PORT = 3000;

function resolveTunnel(value: boolean | string | undefined): ResolvedTunnel {
    if (value === false) return { mode: 'off' };
    if (typeof value === 'string') return { mode: 'url', url: value };
    return { mode: 'quick' };
}

// ConfigValidator reports a vitePlugins that isn't an array
function vitePluginOptionsOf(config: unknown): unknown[] {
    return isPlainObject(config) && Array.isArray(config.vitePlugins) ? config.vitePlugins : [];
}

function resolveTypecheck(value: SeedcordHmrConfig['typecheck'], root: string): ResolvedTypecheck {
    if (value === undefined || value === false) return { enabled: false };
    if (value === true || value.tsconfig === undefined) return { enabled: true };

    return { enabled: true, tsconfig: resolve(root, value.tsconfig) };
}

export class ProjectLoader {
    constructor(
        private readonly openModules: OpenModules,
        private readonly shell: ShellMode,
        private readonly defaultMode: DefaultMode = 'development'
    ) {}

    public async readConfig(projectDir = process.cwd()): Promise<ResolvedSeedcordConfig> {
        const mode = this.shell.viteMode(this.defaultMode);
        Envapter.environment = mode;
        const configPath = locateConfig(projectDir);
        const configDir = dirname(configPath);
        const target = detectTarget(configDir);
        await using configModules = await this.openModules(configDir, target, mode, 'config');
        const project = new Project(await this.resolveConfig(configModules, configPath, target, mode), configModules);
        await assertNoHashPaths(project);
        await assertTargetMatchesTsconfig(project);
        return project.config;
    }

    // starts the config's vite plugins. on an edge bot it also runs cloudflare.config.ts
    public async openProject(config: ResolvedSeedcordConfig): Promise<Project> {
        const botModules = await this.openModules(
            dirname(config.configFile),
            config.target,
            config.viteMode,
            config
        ).catch(rethrowVitePluginError);
        return new Project(config, botModules);
    }

    private async resolveConfig(
        modules: ModuleLoader,
        configPath: string,
        target: BuildTarget,
        mode: string
    ): Promise<ResolvedSeedcordConfig> {
        const loadedModule = await modules.importModule(configPath);
        const config: unknown = await Promise.resolve(resolveDefaultExport(loadedModule));
        const pluginEntries = await flattenVitePlugins(vitePluginOptionsOf(config));
        const validator: ConfigValidator = new ConfigValidator(target, configPath);
        validator.validate(config, pluginEntries);
        const vitePlugins = pluginEntries.map(({ value }) => value).filter(isVitePlugin);

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
            viteMode: mode,
            tunnel: resolveTunnel(config.tunnel),
            hmr: config.hmr,
            vitePlugins: wrapVitePlugins(vitePlugins, configPath)
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
