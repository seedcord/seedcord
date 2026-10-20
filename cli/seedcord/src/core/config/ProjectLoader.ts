import { dirname, resolve } from 'node:path';

import { Project } from '#core/project/Project';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { realPath } from '#core/project/realPath';
import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import { assertNoHashPaths } from './assertNoHashPaths';
import { assertPathsBundled } from './assertPathsBundled';
import { assertTargetMatchesTsconfig } from './assertTargetMatchesTsconfig';
import { ConfigValidator, isEdgeConfig } from './ConfigValidator';
import { detectTarget } from './detectTarget';
import { LoadedConfig } from './LoadedConfig';
import { locateConfig } from './locateConfig';
import { rethrowVitePluginError, VitePlugins } from './vitePlugins';

import type { ModuleLoader, OpenModules } from '#core/modules/ModuleLoader';
import type { RealPath } from '#core/project/realPath';
import type { DefaultMode, ShellMode } from '#core/viteMode';
import type { CheckedConfig } from './ConfigValidator';
import type { BuildTarget } from './detectTarget';
import type {
    ResolvedSeedcordBuildConfig,
    ResolvedSeedcordConfig,
    ResolvedTarget,
    ResolvedTunnel,
    ResolvedTypecheck,
    SeedcordBuildConfig,
    SeedcordHmrConfig
} from './schema';

// the node http Seedcord's default port
const EDGE_DEV_PORT = 3000;

// runs before any plugin in vitePlugins starts
export type ProjectCheck = (project: Project) => void | Promise<void>;

function resolveTunnel(value: boolean | string | undefined): ResolvedTunnel {
    if (value === false) return { mode: 'off' };
    if (typeof value === 'string') return { mode: 'url', url: value };
    return { mode: 'quick' };
}

function resolveTypecheck(value: SeedcordHmrConfig['typecheck'], root: string): ResolvedTypecheck {
    if (value === undefined || value === false) return { enabled: false };
    if (value === true || value.tsconfig === undefined) return { enabled: true };

    return { enabled: true, tsconfig: realPathUnder(root, value.tsconfig) };
}

function realPathUnder(base: string, path: string): RealPath {
    return realPath(resolve(base, path));
}

export class ProjectLoader {
    constructor(
        private readonly openModules: OpenModules,
        private readonly shell: ShellMode,
        private readonly defaultMode: DefaultMode = 'development'
    ) {}

    public async readConfig(projectDir = process.cwd(), check?: ProjectCheck): Promise<LoadedConfig> {
        const configPath = realPath(locateConfig(projectDir));
        const configDir = realPath(dirname(configPath));
        const mode = this.shell.applyMode(this.defaultMode, configDir);
        const target = detectTarget(configDir);
        await using stack = new AsyncDisposableStack();
        const configModules = stack.use(await this.openModules(configDir, target, mode, 'config'));
        const config = await this.resolveConfig(configModules, configPath, target, mode);
        const project = new Project(config, new ProjectFiles(config), configModules);
        assertPathsBundled(project);
        await assertNoHashPaths(project);
        await assertTargetMatchesTsconfig(project);
        await check?.(project);
        const loaded = new LoadedConfig(config, project.files);
        return loaded.hasVitePlugins ? new LoadedConfig(config, project.files, stack.move()) : loaded;
    }

    // starts the config's vite plugins. on an edge bot it also runs cloudflare.config.ts
    public async openProject(loaded: LoadedConfig): Promise<Project> {
        await using stack = new AsyncDisposableStack();
        stack.use(loaded);
        const { config, files } = loaded;
        const botModules = await this.openModules(
            dirname(config.configFile),
            config.target,
            config.viteMode,
            config
        ).catch(rethrowVitePluginError);
        return new Project(config, files, botModules, stack.move());
    }

    private async resolveConfig(
        modules: ModuleLoader,
        configPath: RealPath,
        target: BuildTarget,
        mode: string
    ): Promise<ResolvedSeedcordConfig> {
        const loadedModule = await modules.importModule(configPath);
        const raw: unknown = await Promise.resolve(resolveDefaultExport(loadedModule));
        const checked = new ConfigValidator(target).validate(raw);
        const { config } = checked;

        const configDir = dirname(configPath);
        const root = realPathUnder(configDir, config.root ?? '.');
        const instance = realPathUnder(root, config.instance);
        const build = this.resolveBuildOptions(configDir, config.build);
        const typecheck = resolveTypecheck(config.hmr?.typecheck, root);

        return {
            instance,
            root,
            files: (config.files ?? []).map((folder) => realPathUnder(root, folder)),
            configFile: configPath,
            target: this.resolveTarget(root, configDir, checked),
            build,
            typecheck,
            idleAnimation: config.idleAnimation ?? true,
            viteMode: mode,
            tunnel: resolveTunnel(config.tunnel),
            hmr: config.hmr,
            vitePlugins: new VitePlugins(config.vitePlugins, configPath)
        } satisfies ResolvedSeedcordConfig;
    }

    private resolveTarget(root: string, configDir: string, checked: CheckedConfig): ResolvedTarget {
        if (isEdgeConfig(checked)) return { ...checked.target, port: checked.config.port ?? EDGE_DEV_PORT };

        const {
            target,
            config: { build }
        } = checked;
        return {
            ...target,
            start: build?.start === undefined ? undefined : realPathUnder(root, build.start),
            outDir: realPathUnder(configDir, build?.outDir ?? 'dist')
        };
    }

    private resolveBuildOptions(
        configDir: string,
        build: SeedcordBuildConfig | undefined
    ): ResolvedSeedcordBuildConfig {
        return build?.tsconfig ? { tsconfig: realPathUnder(configDir, build.tsconfig) } : {};
    }
}
