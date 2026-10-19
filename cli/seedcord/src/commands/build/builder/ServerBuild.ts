import { existsSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { createBuilder } from 'vite';

import { BOT_ENVIRONMENT, botEnvironment } from '#core/modules/botEnvironment';
import { viteKey } from '#core/project/ProjectFiles';

import { assertOutDirSafe } from './assertOutDirSafe';
import { bundleFailed, bundleStats, ENTRY_FILE_NAME } from './output';
import { pinModulePaths } from './pinModulePaths';
import { serverCommands } from './serverCommands';
import { ENTRY_ID, exportInstance, isServerEntry, runStartFile, serverEntry } from './serverEntry';
import { TargetBuild } from './TargetBuild';

import type { ResolvedSeedcordConfig, ResolvedServerTarget } from '#core/config/schema';
import type { Project } from '#core/project/Project';
import type { BundleStats } from './output';
import type { NextCommand } from './TargetBuild';
import type { Rolldown, ViteBuilder } from 'vite';

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

export class ServerBuild extends TargetBuild {
    public readonly kind = 'server';

    constructor(
        project: Project,
        private readonly target: ResolvedServerTarget
    ) {
        super(project);
    }

    public static check({ root }: ResolvedSeedcordConfig, { start, outDir }: ResolvedServerTarget): void {
        if (start !== undefined && !existsSync(start))
            throw new SeedcordError(SeedcordErrorCode.CliFileNotFound, [start]);
        assertOutDirSafe(outDir, root);
    }

    public nextCommands(bundle: BundleStats): NextCommand[] {
        return this.target.start === undefined ? [] : serverCommands(this.project.config.configFile, bundle.entry);
    }

    public async bundle(): Promise<BundleStats> {
        const { config, configDir, files } = this.project;
        const { start, outDir } = this.target;
        const { root } = config;
        const importBot =
            start === undefined
                ? exportInstance(viteKey(configDir, config.instance))
                : runStartFile(viteKey(configDir, start));
        const builtFiles = {
            files,
            folders: await files.foldersIncludingEmpty(),
            rootKey: viteKey(configDir, root),
            configFile: relative(outDir, config.configFile)
        };

        const builder = await createBuilder({
            root: configDir,
            mode: config.viteMode,
            configFile: false,
            // vite copies <root>/public into outDir otherwise
            publicDir: false,
            logLevel: 'warn',
            plugins: [serverEntry(builtFiles, importBot), pinModulePaths(files), config.vitePlugins.create()],
            resolve: { tsconfigPaths: true },
            environments: {
                [BOT_ENVIRONMENT]: {
                    resolve: { external: true },
                    build: {
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
                    }
                }
            }
        }).catch(bundleFailed);
        const result = await builder.build(botEnvironment(builder.environments)).catch(bundleFailed);

        return bundleStats(outputChunks(result), files, join(outDir, ENTRY_FILE_NAME));
    }
}
