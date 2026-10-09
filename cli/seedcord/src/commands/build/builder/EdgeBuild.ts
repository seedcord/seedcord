import { dirname, join, relative, sep } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { createBuilder } from 'vite';

import { assertNodeCompat } from './assertNodeCompat';
import { bootWorker } from './bootWorker';
import { bundleFailed, ENTRY_FILE_NAME } from './output';
import { pinModulePaths } from './pinModulePaths';
import { TargetBuild } from './TargetBuild';
import { WORKER_ENTRY_ID, workerEntry } from './workerEntry';

import type { BuildStep } from '#commands/build/BuildRunner';
import type { EdgeTarget } from '#core/config/detectTarget';
import type { Steps } from '#core/output/Steps';
import type { Project } from '#core/project/Project';
import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { BundleStats } from './output';
import type { NextCommand } from './TargetBuild';
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

export class EdgeBuild extends TargetBuild {
    // wrangler deploy reads the build through a file vite writes under its root
    private readonly viteRoot: string;
    private cloudflare?: Promise<CloudflarePlugin>;

    // an optional peer resolves from the bot's project
    constructor(
        project: Project,
        private readonly target: EdgeTarget,
        private readonly importCloudflare: ImportCloudflare = () => import('@cloudflare/vite-plugin')
    ) {
        super(project);
        this.viteRoot = dirname(target.wranglerConfig);
    }

    // the worker bundles every file under root, tool configs like eslint.config.ts included
    public check(): void {
        const { config, configDir } = this.project;
        if (config.root === configDir) {
            throw new SeedcordError(SeedcordErrorCode.CliEdgeRootIsConfigFolder, [config.configFile, config.root]);
        }
    }

    public async bundle(): Promise<BundleStats> {
        const { config, files } = this.project;
        const { viteRoot, target } = this;
        const { outDir } = config.build;
        const folders = await files.foldersIncludingEmpty();

        let chunks: Rolldown.OutputChunk[] = [];
        const builder = await createBuilder({
            root: viteRoot,
            configFile: false,
            publicDir: false,
            logLevel: 'warn',
            plugins: [
                workerEntry({
                    files,
                    folders,
                    instance: viteKey(viteRoot, config.instance),
                    base: viteKey(viteRoot, config.root)
                }),
                pinModulePaths(files),
                captureChunks((captured) => {
                    chunks = captured;
                }),
                await this.workerPlugins()
            ],
            resolve: { tsconfigPaths: true },
            environments: workerEnvironment(outDir)
        }).catch(bundleFailed);
        await builder.buildApp().catch(bundleFailed);
        assertNodeCompat(outDir, target.wranglerConfig);

        return workerStats(chunks, files, join(outDir, ENTRY_FILE_NAME));
    }

    public async afterBundle(steps: Steps<BuildStep>): Promise<void> {
        await steps.step('boot', async () =>
            bootWorker({
                root: this.viteRoot,
                plugins: [await this.workerPlugins()],
                environments: workerEnvironment(this.project.config.build.outDir)
            })
        );
    }

    public nextCommands(): NextCommand[] {
        return [['deploy', 'wrangler deploy']];
    }

    private async workerPlugins(): Promise<Plugin[]> {
        this.cloudflare ??= this.loadCloudflare();
        const cloudflare = await this.cloudflare;
        return cloudflare({
            configPath: this.target.wranglerConfig,
            config: { main: WORKER_ENTRY_ID },
            viteEnvironment: { name: WORKER_ENVIRONMENT },
            inspectorPort: false,
            persistState: false
        });
    }

    private async loadCloudflare(): Promise<CloudflarePlugin> {
        try {
            const { cloudflare } = await this.importCloudflare();
            return cloudflare;
        } catch (error: unknown) {
            if (isModuleNotFound(error)) {
                throw new SeedcordError(SeedcordErrorCode.CliEdgeVitePluginMissing, [this.viteRoot], { cause: error });
            }
            const reason = Error.isError(error) ? error.message : String(error);
            throw new SeedcordError(SeedcordErrorCode.CliImportFailed, ['@cloudflare/vite-plugin', reason], {
                cause: error
            });
        }
    }
}
