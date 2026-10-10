import { dirname, join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';
import { isInside } from '@seedcord/utils/node/internal';
import { createBuilder } from 'vite';

import { viteKey } from '#core/project/ProjectFiles';

import { assertNodeCompat } from './assertNodeCompat';
import { bootWorker } from './bootWorker';
import { bundleFailed, bundleStats, ENTRY_FILE_NAME } from './output';
import { pinModulePaths } from './pinModulePaths';
import { TargetBuild } from './TargetBuild';
import { WORKER_ENTRY_ID, workerEntry } from './workerEntry';

import type { EdgeTarget } from '#core/config/detectTarget';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { Project } from '#core/project/Project';
import type { BundleStats } from './output';
import type { NextCommand } from './TargetBuild';
import type * as CloudflareVitePlugin from '@cloudflare/vite-plugin';
import type { EnvironmentOptions, Plugin, Rolldown } from 'vite';

type ImportCloudflare = () => Promise<typeof CloudflareVitePlugin>;
type CloudflarePlugin = typeof CloudflareVitePlugin.cloudflare;

const WORKER_ENVIRONMENT = 'worker';
const CLOUDFLARE_PLUGIN = '@cloudflare/vite-plugin';

// node ends this message with the path of the file that did the import
// for a missing dependency of the plugin, that path has the plugin's name in it too
function isPluginMissing(error: unknown): boolean {
    const notFound = Error.isError(error) && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND';
    return notFound && error.message.startsWith(`Cannot find package '${CLOUDFLARE_PLUGIN}'`);
}

// workerd loads a worker only when each named export is a function or a handler object
async function functionExportsOf(modules: ModuleLoader, instance: string): Promise<string[]> {
    const module = await modules.importModule<Record<string, unknown>>(instance);
    return Object.entries(module).reduce<string[]>((names, [name, value]) => {
        if (name !== 'default' && typeof value === 'function') names.push(name);
        return names;
    }, []);
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

function workerEnvironment(outDir: string): Record<string, EnvironmentOptions> {
    return {
        [WORKER_ENVIRONMENT]: {
            build: {
                outDir,
                emptyOutDir: true,
                sourcemap: true,
                minify: false,
                rolldownOptions: {
                    // the glob lazily imports files that bot.ts also imports. both get the same module.
                    checks: { ineffectiveDynamicImport: false },
                    output: {
                        entryFileNames: ENTRY_FILE_NAME,
                        // runs bind-env and the built files before bot.ts, even when a top-level await splits bot.ts into its own chunk
                        strictExecutionOrder: true
                    }
                }
            }
        }
    };
}

export class EdgeBuild extends TargetBuild {
    // the plugin writes .wrangler/deploy/config.json under vite's root
    // wrangler deploy reads it from beside the wrangler config
    private readonly viteRoot: string;
    private cloudflare?: Promise<CloudflarePlugin>;

    // import() finds the optional peer through seedcord's own folder in node_modules
    constructor(
        project: Project,
        private readonly target: EdgeTarget,
        private readonly importCloudflare: ImportCloudflare = () => import('@cloudflare/vite-plugin')
    ) {
        super(project);
        this.viteRoot = dirname(target.wranglerConfig);
    }

    public check(): void {
        const { config, configDir } = this.project;
        if (isInside(config.root, configDir)) {
            throw new SeedcordError(SeedcordErrorCode.CliEdgeRootHoldsConfig, [config.configFile, config.root]);
        }
    }

    public async bundle(): Promise<BundleStats> {
        const { config, files, modules } = this.project;
        const { viteRoot, target } = this;
        const { outDir } = config.build;
        const [folders, functionExports] = await Promise.all([
            files.foldersIncludingEmpty(),
            functionExportsOf(modules, config.instance)
        ]);

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
                    instanceKey: viteKey(viteRoot, config.instance),
                    functionExports,
                    rootKey: viteKey(viteRoot, config.root)
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

        return bundleStats(chunks, files, join(outDir, ENTRY_FILE_NAME));
    }

    public override async boot(): Promise<void> {
        await bootWorker({
            root: this.viteRoot,
            plugins: [await this.workerPlugins()],
            environments: workerEnvironment(this.project.config.build.outDir)
        });
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
            if (isPluginMissing(error)) {
                throw new SeedcordError(SeedcordErrorCode.CliEdgeVitePluginMissing, [this.viteRoot], { cause: error });
            }
            throw new SeedcordError(SeedcordErrorCode.CliImportFailed, [CLOUDFLARE_PLUGIN, asError(error).message], {
                cause: error
            });
        }
    }
}
