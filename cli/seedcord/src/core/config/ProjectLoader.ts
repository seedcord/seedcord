import { dirname, resolve } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { isInside } from '@seedcord/utils/node/internal';

import { Project } from '#core/project/Project';
import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import { assertNoHashPaths } from './assertNoHashPaths';
import { assertTargetMatchesTsconfig } from './assertTargetMatchesTsconfig';
import { ConfigValidator, isEdgeConfig } from './ConfigValidator';
import { detectTarget } from './detectTarget';
import { LoadedConfig } from './LoadedConfig';
import { locateConfig } from './locateConfig';
import { rethrowVitePluginError, VitePlugins } from './vitePlugins';

import type { ModuleLoader, OpenModules } from '#core/modules/ModuleLoader';
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

function resolveStart(root: string, start: string): string {
    const file = resolve(root, start);
    if (!isInside(root, file)) throw new SeedcordTypeError(SeedcordErrorCode.CorePathOutsideRoot, [file, root]);
    return file;
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

export class ProjectLoader {
    constructor(
        private readonly openModules: OpenModules,
        private readonly shell: ShellMode,
        private readonly defaultMode: DefaultMode = 'development'
    ) {}

    public async readConfig(
        projectDir = process.cwd(),
        check?: (config: ResolvedSeedcordConfig) => void
    ): Promise<LoadedConfig> {
        const configPath = locateConfig(projectDir);
        const configDir = dirname(configPath);
        const mode = this.shell.applyMode(this.defaultMode, configDir);
        const target = detectTarget(configDir);
        await using stack = new AsyncDisposableStack();
        const configModules = stack.use(await this.openModules(configDir, target, mode, 'config'));
        const project = new Project(await this.resolveConfig(configModules, configPath, target, mode), configModules);
        await assertNoHashPaths(project);
        await assertTargetMatchesTsconfig(project);
        check?.(project.config);
        const loaded = new LoadedConfig(project.config);
        return loaded.hasVitePlugins ? new LoadedConfig(project.config, stack.move()) : loaded;
    }

    // starts the config's vite plugins. on an edge bot it also runs cloudflare.config.ts
    public async openProject(loaded: LoadedConfig): Promise<Project> {
        await using stack = new AsyncDisposableStack();
        stack.use(loaded);
        const { config } = loaded;
        const botModules = await this.openModules(
            dirname(config.configFile),
            config.target,
            config.viteMode,
            config
        ).catch(rethrowVitePluginError);
        return new Project(config, botModules, stack.move());
    }

    private async resolveConfig(
        modules: ModuleLoader,
        configPath: string,
        target: BuildTarget,
        mode: string
    ): Promise<ResolvedSeedcordConfig> {
        const loadedModule = await modules.importModule(configPath);
        const raw: unknown = await Promise.resolve(resolveDefaultExport(loadedModule));
        const checked = new ConfigValidator(target).validate(raw);
        const { config } = checked;

        const configDir = dirname(configPath);
        const root = resolve(configDir, config.root ?? '.');
        const instance = resolve(root, config.instance);
        const build = this.resolveBuildOptions(configDir, config.build);
        const typecheck = resolveTypecheck(config.hmr?.typecheck, root);

        return {
            instance,
            root,
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
            start: build?.start === undefined ? undefined : resolveStart(root, build.start),
            outDir: resolve(configDir, build?.outDir ?? 'dist')
        };
    }

    private resolveBuildOptions(
        configDir: string,
        build: SeedcordBuildConfig | undefined
    ): ResolvedSeedcordBuildConfig {
        return build?.tsconfig ? { tsconfig: resolve(configDir, build.tsconfig) } : {};
    }
}
