import { dirname, extname } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { build } from 'vite';

import { pinModulePaths } from './pinModulePaths';
import { ProjectFiles } from './ProjectFiles';
import { ENTRY_FILE_NAME, ENTRY_ID, isSeedcordEntry, seedcordEntry } from './seedcordEntry';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';
import type { ILogger } from '@seedcord/types';

const NODE_TARGET = 'node24';

// Echo.ts builds to Echo.js and Echo.json to Echo.json.js
function outputName(moduleId: string | null | undefined): string {
    if (isSeedcordEntry(moduleId)) return ENTRY_FILE_NAME;
    if (!moduleId?.endsWith('?raw')) return '[name].js';
    return `[name]${extname(moduleId.slice(0, -'?raw'.length))}.js`;
}

export class ViteBuilder {
    constructor(private readonly logger: ILogger) {}

    public async build(config: ResolvedSeedcordDevConfig): Promise<void> {
        const { root, entry } = config;
        const { outDir } = config.build;
        const files = new ProjectFiles(root, outDir, dirname(config.configFile));
        const folders = await files.folders();

        this.logger.info(`Bundling ${root} into ${outDir}`);

        try {
            await build({
                root,
                configFile: false,
                // vite copies <root>/public into outDir otherwise
                publicDir: false,
                logLevel: 'warn',
                plugins: [seedcordEntry({ files, entry, folders }), pinModulePaths(files)],
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
            });
        } catch (error: unknown) {
            const reason = Error.isError(error) ? error.message : String(error);
            throw new SeedcordError(SeedcordErrorCode.CliBundleFailed, [reason]);
        }
    }
}
