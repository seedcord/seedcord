import { extname, join, relative } from 'node:path';

import { createBuilder } from 'vite';

import { BOT_ENVIRONMENT, botEnvironment } from '#core/modules/botEnvironment';
import { viteKey } from '#core/project/ProjectFiles';

import { assertOutDirSafe } from './assertOutDirSafe';
import { bundleFailed, bundleStats, ENTRY_FILE_NAME } from './output';
import { pinModulePaths } from './pinModulePaths';
import { ENTRY_ID, isServerEntry, serverEntry } from './serverEntry';
import { TargetBuild } from './TargetBuild';

import type { ResolvedSeedcordConfig, ResolvedServerTarget } from '#core/config/schema';
import type { Project } from '#core/project/Project';
import type { BundleStats } from './output';
import type { BuildEnvironmentOptions, PluginOption, Rolldown, ViteBuilder } from 'vite';

const NODE_TARGET = 'node24';

function outputChunks(result: Awaited<ReturnType<ViteBuilder['build']>>): Rolldown.OutputChunk[] {
    // vite returns a watcher only under build.watch
    const outputs = [result].flat().filter((output) => 'output' in output);
    return outputs.flatMap(({ output }) => output.filter((file) => file.type === 'chunk'));
}

// Echo.ts builds to Echo.js and Echo.json to Echo.json.js
function outputName(moduleId: string | null | undefined): string {
    if (isServerEntry(moduleId)) return ENTRY_FILE_NAME;
    const extension = extname(moduleId?.split('?')[0] ?? '');
    if (extension === '' || extension === '.ts' || extension === '.js') return '[name].js';
    return `[name]${extension}.js`;
}

export abstract class ServerBuild<Target extends ResolvedServerTarget = ResolvedServerTarget> extends TargetBuild {
    public readonly kind = 'server';

    constructor(
        project: Project,
        protected readonly target: Target
    ) {
        super(project);
    }

    public static check({ root }: ResolvedSeedcordConfig, { outDir }: ResolvedServerTarget): void {
        assertOutDirSafe(outDir, root);
    }

    public abstract bundle(): Promise<BundleStats>;

    protected async bundleJs(importBot: string[]): Promise<BundleStats> {
        const { config, configDir, files } = this.project;
        const { outDir } = this.target;
        const { root } = config;
        const builtFiles = {
            files,
            folders: await files.foldersIncludingEmpty(),
            rootKey: viteKey(configDir, root),
            configFile: relative(outDir, config.configFile)
        };

        const result = await this.buildBot([serverEntry(builtFiles, importBot), pinModulePaths(files)], {
            outDir,
            emptyOutDir: true,
            sourcemap: true,
            minify: false,
            target: NODE_TARGET,
            rolldownOptions: {
                input: ENTRY_ID,
                output: {
                    format: 'esm',
                    preserveModules: true,
                    preserveModulesRoot: root,
                    entryFileNames: (chunk) => outputName(chunk.facadeModuleId)
                }
            }
        });
        return bundleStats(outputChunks(result), files, join(outDir, ENTRY_FILE_NAME));
    }

    protected async buildBot(
        plugins: PluginOption[],
        build: BuildEnvironmentOptions
    ): Promise<Awaited<ReturnType<ViteBuilder['build']>>> {
        const { config, configDir } = this.project;
        const builder = await createBuilder({
            root: configDir,
            mode: config.viteMode,
            configFile: false,
            // vite copies <root>/public into outDir otherwise
            publicDir: false,
            logLevel: 'warn',
            plugins: [...plugins, config.vitePlugins.create()],
            // vite's oxc transform would empty the declarations rolldown-plugin-dts emits. this list replaces vite's default of .js
            oxc: { exclude: [/\.js$/, /\.d\.[cm]?ts$/] },
            resolve: { tsconfigPaths: true },
            environments: { [BOT_ENVIRONMENT]: { resolve: { external: true }, build } }
        }).catch(bundleFailed);
        return builder.build(botEnvironment(builder.environments)).catch(bundleFailed);
    }
}
