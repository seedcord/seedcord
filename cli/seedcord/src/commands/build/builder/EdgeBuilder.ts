import { dirname, join, relative, sep } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { createBuilder } from 'vite';

import { assertNodeCompat } from './assertNodeCompat';
import { bootWorker } from './bootWorker';
import { bundleFailed, ENTRY_FILE_NAME } from './output';
import { pinModulePaths } from './pinModulePaths';
import { WORKER_ENTRY_ID, WORKER_ROOT, workerEntry } from './workerEntry';

import type { EdgeTarget } from '#core/config/detectTarget';
import type { Project } from '#core/project/Project';
import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { BundleStats } from './output';
import type * as CloudflareVitePlugin from '@cloudflare/vite-plugin';
import type { EnvironmentOptions, Plugin, Rolldown } from 'vite';

type ImportCloudflare = () => Promise<typeof CloudflareVitePlugin>;
type CloudflarePlugin = typeof CloudflareVitePlugin.cloudflare;

const WORKER_ENVIRONMENT = 'worker';

function isModuleNotFound(error: unknown): boolean {
    return Error.isError(error) && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND';
}

// the path vite resolves against its root, like /src/bot.ts
function viteKey(viteRoot: string, path: string): string {
    return `/${relative(viteRoot, path).split(sep).join('/')}`;
}

function captureChunks(onChunks: (chunks: Rolldown.OutputChunk[]) => void): Plugin {
    return {
        name: 'seedcord:capture-chunks',
        applyToEnvironment: (environment) => environment.name === WORKER_ENVIRONMENT,
        generateBundle(_options, bundle) {
            onChunks(Object.values(bundle).filter((file) => file.type === 'chunk'));
        }
    };
}

function workerStats(chunks: Rolldown.OutputChunk[], files: ProjectFiles, entry: string): BundleStats {
    const projectIds = chunks.flatMap((chunk) => chunk.moduleIds).filter((id) => files.holds(id.split('?')[0] ?? ''));
    const textFiles = projectIds.filter((id) => id.includes('?raw')).length;

    return {
        modules: projectIds.length - textFiles,
        textFiles,
        bytes: chunks.reduce((total, chunk) => total + Buffer.byteLength(chunk.code), 0),
        entry
    };
}

function workerPlugins(cloudflare: CloudflarePlugin, target: EdgeTarget): Plugin[] {
    return cloudflare({
        configPath: target.wranglerConfig,
        config: { main: WORKER_ENTRY_ID },
        viteEnvironment: { name: WORKER_ENVIRONMENT },
        inspectorPort: false,
        persistState: false
    });
}

function workerEnvironment(outDir: string): Record<string, EnvironmentOptions> {
    return {
        [WORKER_ENVIRONMENT]: {
            build: {
                outDir,
                emptyOutDir: true,
                sourcemap: true,
                minify: false,
                rolldownOptions: { output: { entryFileNames: ENTRY_FILE_NAME } }
            }
        }
    };
}

export class EdgeBuilder {
    // an optional peer resolves from the bot's project
    constructor(private readonly importCloudflare: ImportCloudflare = () => import('@cloudflare/vite-plugin')) {}

    public async build({ config, files }: Project, target: EdgeTarget): Promise<BundleStats> {
        // wrangler deploy reads the build through a file vite writes under its root
        const viteRoot = dirname(target.wranglerConfig);
        const { cloudflare } = await this.loadCloudflare(viteRoot);
        const { root, instance } = config;
        const { outDir } = config.build;
        const folders = await files.foldersIncludingEmpty();

        let chunks: Rolldown.OutputChunk[] = [];
        const builder = await createBuilder({
            root: viteRoot,
            configFile: false,
            publicDir: false,
            logLevel: 'warn',
            plugins: [
                workerEntry({ files, folders, instance: viteKey(viteRoot, instance), base: viteKey(viteRoot, root) }),
                // eager imports evaluate before the built files slot holds a root
                pinModulePaths(files, JSON.stringify(WORKER_ROOT)),
                captureChunks((captured) => {
                    chunks = captured;
                }),
                workerPlugins(cloudflare, target)
            ],
            resolve: { tsconfigPaths: true },
            environments: workerEnvironment(outDir)
        }).catch(bundleFailed);
        await builder.buildApp().catch(bundleFailed);
        assertNodeCompat(outDir, target.wranglerConfig);

        return workerStats(chunks, files, join(outDir, ENTRY_FILE_NAME));
    }

    public async boot({ config }: Project, target: EdgeTarget): Promise<void> {
        const viteRoot = dirname(target.wranglerConfig);
        const { cloudflare } = await this.loadCloudflare(viteRoot);

        await bootWorker({
            root: viteRoot,
            plugins: [workerPlugins(cloudflare, target)],
            environments: workerEnvironment(config.build.outDir)
        });
    }

    private async loadCloudflare(projectDir: string): Promise<typeof CloudflareVitePlugin> {
        try {
            return await this.importCloudflare();
        } catch (error: unknown) {
            if (isModuleNotFound(error)) {
                throw new SeedcordError(SeedcordErrorCode.CliEdgeVitePluginMissing, [projectDir], { cause: error });
            }
            const reason = Error.isError(error) ? error.message : String(error);
            throw new SeedcordError(SeedcordErrorCode.CliImportFailed, ['@cloudflare/vite-plugin', reason], {
                cause: error
            });
        }
    }
}
