import { existsSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { build } from 'vite';

import { viteKey } from '#core/project/ProjectFiles';

import { assertOutDirSafe } from './assertOutDirSafe';
import { bundleFailed, bundleStats, ENTRY_FILE_NAME } from './output';
import { pinModulePaths } from './pinModulePaths';
import { serverCommands } from './serverCommands';
import { ENTRY_ID, isServerEntry, serverEntry } from './serverEntry';
import { TargetBuild } from './TargetBuild';

import type { ResolvedSeedcordConfig, ResolvedServerTarget } from '#core/config/schema';
import type { Project } from '#core/project/Project';
import type { BundleStats } from './output';
import type { NextCommand } from './TargetBuild';
import type { Rolldown } from 'vite';

const NODE_TARGET = 'node24';

function outputChunks(result: Awaited<ReturnType<typeof build>>): Rolldown.OutputChunk[] {
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

    public static check({ root }: ResolvedSeedcordConfig, { entry, outDir }: ResolvedServerTarget): void {
        if (!existsSync(entry)) throw new SeedcordError(SeedcordErrorCode.CliEntryNotFound, [entry]);
        assertOutDirSafe(outDir, root);
    }

    public nextCommands(bundle: BundleStats): NextCommand[] {
        return serverCommands(this.project.config.configFile, bundle.entry);
    }

    public async bundle(): Promise<BundleStats> {
        const { config, configDir, files } = this.project;
        const { entry, outDir } = this.target;
        const { root } = config;
        const folders = await files.foldersIncludingEmpty();

        const result = await build({
            root: configDir,
            mode: config.viteMode,
            configFile: false,
            // vite copies <root>/public into outDir otherwise
            publicDir: false,
            logLevel: 'warn',
            plugins: [
                serverEntry({
                    files,
                    folders,
                    entryKey: viteKey(configDir, entry),
                    rootKey: viteKey(configDir, root),
                    envDir: relative(outDir, configDir)
                }),
                pinModulePaths(files),
                ...config.vitePlugins
            ],
            resolve: { tsconfigPaths: true },
            build: {
                ssr: true,
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
            },
            ssr: { target: 'node', external: true }
        }).catch(bundleFailed);

        return bundleStats(outputChunks(result), files, join(outDir, ENTRY_FILE_NAME));
    }
}
