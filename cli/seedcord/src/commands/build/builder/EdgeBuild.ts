import { dirname, join } from 'node:path';

import { warnLinks } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { isInside } from '@seedcord/utils/node/internal';
import { createBuilder } from 'vite';

import { cliLogger } from '#core/cliLogger';
import { restFromEnv } from '#core/discord/restFromEnv';
import { importCloudflare, loadCloudflare, WORKER_ENVIRONMENT } from '#core/modules/cloudflarePlugin';
import { CommandScanner } from '#core/modules/CommandScanner';
import { functionExportsOf } from '#core/modules/workerExports';
import { viteKey } from '#core/project/ProjectFiles';

import { assertNodeCompat } from './assertNodeCompat';
import { bootWorker } from './bootWorker';
import { bundleFailed, bundleStats, ENTRY_FILE_NAME } from './output';
import { pinModulePaths } from './pinModulePaths';
import { readDiscord } from './readDiscord';
import { TargetBuild } from './TargetBuild';
import { WORKER_ENTRY_ID, workerEntry } from './workerEntry';

import type { EdgeTarget } from '#core/config/detectTarget';
import type { CloudflarePlugin, ImportCloudflare } from '#core/modules/cloudflarePlugin';
import type { Project } from '#core/project/Project';
import type { BundleStats } from './output';
import type { CommandsInCode } from './readDiscord';
import type { NextCommand } from './TargetBuild';
import type { REST } from '@discordjs/rest';
import type { BakedIds } from '@seedcord/core/internal';
import type { BotConfig, CommandsConfig } from '@seedcord/types';
import type { EnvironmentOptions, Plugin, Rolldown } from 'vite';

interface EdgeBuildDeps {
    importCloudflare: ImportCloudflare;
    openDiscord: () => Pick<REST, 'get'>;
}

const DEFAULT_DEPS: EdgeBuildDeps = { importCloudflare, openDiscord: restFromEnv };

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
    public readonly kind = 'edge';
    // the plugin writes .wrangler/deploy/config.json under vite's root
    // wrangler deploy reads it from beside the wrangler config
    private readonly viteRoot: string;
    private readonly deps: EdgeBuildDeps;
    private readonly logger = cliLogger('Build');
    private cloudflare?: Promise<CloudflarePlugin>;

    constructor(
        project: Project,
        private readonly target: EdgeTarget,
        deps: Partial<EdgeBuildDeps> = {}
    ) {
        super(project);
        this.viteRoot = dirname(target.wranglerConfig);
        this.deps = { ...DEFAULT_DEPS, ...deps };
    }

    public check(): void {
        const { config, configDir } = this.project;
        if (isInside(config.root, configDir)) {
            throw new SeedcordError(SeedcordErrorCode.CliEdgeRootHoldsConfig, [config.configFile, config.root]);
        }
    }

    public async readDiscord(bot: BotConfig): Promise<BakedIds> {
        const read = await readDiscord({
            rest: this.deps.openDiscord(),
            commands: await this.commandsInCode(bot.commands),
            emojis: bot.emojis
        });

        warnLinks(this.logger, read);
        return read.ids;
    }

    public async bundle(ids: BakedIds): Promise<BundleStats> {
        const { config, files, modules } = this.project;
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
                    instanceKey: viteKey(viteRoot, config.instance),
                    functionExports: () => functionExportsOf(modules, config.instance),
                    rootKey: viteKey(viteRoot, config.root),
                    mode: { kind: 'build', ids }
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

    private async commandsInCode(commands: CommandsConfig): Promise<CommandsInCode | undefined> {
        if (commands.path === null) return undefined;
        const scanner = new CommandScanner(this.project.modules, this.project.config.root);
        const found = await scanner.scan(commands.path);
        return { found, configuredGuilds: commands.guilds ?? [] };
    }

    private async workerPlugins(): Promise<Plugin[]> {
        this.cloudflare ??= loadCloudflare(this.viteRoot, this.deps.importCloudflare);
        const cloudflare = await this.cloudflare;
        return cloudflare({
            configPath: this.target.wranglerConfig,
            config: { main: WORKER_ENTRY_ID },
            viteEnvironment: { name: WORKER_ENVIRONMENT },
            inspectorPort: false,
            persistState: false
        });
    }
}
