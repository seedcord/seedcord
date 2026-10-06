import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { build } from 'vite';

import { pinModulePaths } from './pinModulePaths';
import { ProjectFiles } from './ProjectFiles';
import { ENTRY_FILE_NAME, ENTRY_ID, isSeedcordEntry, seedcordEntry } from './seedcordEntry';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';
import type { ILogger } from '@seedcord/types';

const NODE_TARGET = 'node24';

export class ViteBuilder {
    constructor(private readonly logger: ILogger) {}

    public async build(config: ResolvedSeedcordDevConfig): Promise<void> {
        const { root, entry } = config;
        const { outDir } = config.build;
        const files = new ProjectFiles(root, outDir);

        this.logger.info(`Bundling ${root} into ${outDir}`);

        try {
            await build({
                root,
                configFile: false,
                logLevel: 'warn',
                plugins: [
                    seedcordEntry({ root, entry, folders: await files.folders(), excludes: files.excludes() }),
                    pinModulePaths(root)
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
                            entryFileNames: (chunk) =>
                                isSeedcordEntry(chunk.facadeModuleId) ? ENTRY_FILE_NAME : '[name].js'
                        }
                    }
                },
                ssr: { target: 'node', external: true }
            });
        } catch (error: unknown) {
            if (isSeedcordError(error)) throw error;
            const reason = Error.isError(error) ? error.message : String(error);
            throw new SeedcordError(SeedcordErrorCode.CliBundleFailed, [reason]);
        }
    }
}
