import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { build } from 'vite';

import { serverCommands } from '#commands/build/serverCommands';

import { bundleFailed, ENTRY_FILE_NAME } from './output';
import { pinModulePaths } from './pinModulePaths';
import { ENTRY_ID, isServerEntry, serverEntry } from './serverEntry';
import { TargetBuild } from './TargetBuild';

import type { Project } from '#core/project/Project';
import type { BundleStats } from './output';
import type { NextCommand } from './TargetBuild';

const NODE_TARGET = 'node24';

function bundleStats(result: Awaited<ReturnType<typeof build>>, entry: string): BundleStats {
    // vite returns a watcher only under build.watch
    const outputs = [result].flat().filter((output) => 'output' in output);
    const chunks = outputs.flatMap(({ output }) => output.filter((file) => file.type === 'chunk'));
    const projectChunks = chunks.filter((chunk) => !isServerEntry(chunk.facadeModuleId));
    const textFiles = projectChunks.filter((chunk) => chunk.facadeModuleId?.includes('?raw') === true).length;

    return {
        modules: projectChunks.length - textFiles,
        textFiles,
        bytes: chunks.reduce((total, chunk) => total + Buffer.byteLength(chunk.code), 0),
        entry
    };
}

// Echo.ts builds to Echo.js and Echo.json to Echo.json.js
function outputName(moduleId: string | null | undefined): string {
    if (isServerEntry(moduleId)) return ENTRY_FILE_NAME;
    const extension = extname(moduleId?.split('?')[0] ?? '');
    if (extension === '' || extension === '.ts' || extension === '.js') return '[name].js';
    return `[name]${extension}.js`;
}

export class ServerBuild extends TargetBuild {
    constructor(
        project: Project,
        private readonly entry: string
    ) {
        super(project);
    }

    public check(): void {
        if (!existsSync(this.entry)) throw new SeedcordError(SeedcordErrorCode.CliEntryNotFound, [this.entry]);
    }

    public afterBundle(): Promise<void> {
        return Promise.resolve();
    }

    public nextCommands(bundle: BundleStats): NextCommand[] {
        return serverCommands(this.project.config.configFile, bundle.entry);
    }

    public async bundle(): Promise<BundleStats> {
        const { config, files } = this.project;
        const { entry } = this;
        const { root } = config;
        const { outDir } = config.build;
        const folders = await files.foldersIncludingEmpty();

        const result = await build({
            root,
            configFile: false,
            // vite copies <root>/public into outDir otherwise
            publicDir: false,
            logLevel: 'warn',
            plugins: [serverEntry({ files, entry, folders }), pinModulePaths(files)],
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

        return bundleStats(result, join(outDir, ENTRY_FILE_NAME));
    }
}
