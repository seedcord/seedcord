import { extname, join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { build } from 'vite';

import { BUILT_FILES_SLOT } from './builtFiles';
import { pinModulePaths } from './pinModulePaths';
import { ENTRY_FILE_NAME, ENTRY_ID, isServerEntry, serverEntry } from './serverEntry';

import type { Project } from '#core/project/Project';

const NODE_TARGET = 'node24';

export interface BundleStats {
    modules: number;
    textFiles: number;
    bytes: number;
    entry: string;
}

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

export class ServerBuilder {
    public async build({ config, files }: Project, entry: string): Promise<BundleStats> {
        const { root } = config;
        const { outDir } = config.build;
        const folders = await files.foldersIncludingEmpty();

        const result = await build({
            root,
            configFile: false,
            // vite copies <root>/public into outDir otherwise
            publicDir: false,
            logLevel: 'warn',
            plugins: [serverEntry({ files, entry, folders }), pinModulePaths(files, `${BUILT_FILES_SLOT}.root`)],
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
        }).catch((error: unknown) => {
            const reason = Error.isError(error) ? error.message : String(error);
            throw new SeedcordError(SeedcordErrorCode.CliBundleFailed, [reason], { cause: error });
        });

        return bundleStats(result, join(outDir, ENTRY_FILE_NAME));
    }
}
