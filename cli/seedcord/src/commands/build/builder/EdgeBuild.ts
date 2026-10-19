import { dirname, join } from 'node:path';

import { warnLinks } from '@seedcord/core/internal';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { BotLayout, isInside } from '@seedcord/utils/internal';
import { createBuilder } from 'vite';

import { cliLogger } from '#core/cliLogger';
import { restFromEnv } from '#core/discord/restFromEnv';
import { BOT_ENVIRONMENT, LOOK_FOR_BUILD_PLUGIN } from '#core/modules/botEnvironment';
import { importCloudflare, importCloudflareCopy } from '#core/modules/cloudflarePlugin';
import { CommandScanner } from '#core/modules/CommandScanner';
import { functionExportsOf } from '#core/modules/workerExports';

import { assertNodeCompat } from './assertNodeCompat';
import { bootWorker } from './bootWorker';
import { CloudflareWorker } from './CloudflareWorker';
import { bundleFailed, bundleStats, ENTRY_FILE_NAME } from './output';
import { pinModulePaths } from './pinModulePaths';
import { readDiscord } from './readDiscord';
import { TargetBuild } from './TargetBuild';
import { workerEntry } from './workerEntry';

import type { EdgeTarget } from '#core/config/detectTarget';
import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { ImportCloudflare } from '#core/modules/cloudflarePlugin';
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
        applyToEnvironment: (environment) => environment.name === BOT_ENVIRONMENT,
        generateBundle(_options, bundle) {
            onChunks(Object.values(bundle).filter((file) => file.type === 'chunk'));
        }
    };
}

function workerEnvironment(): Record<string, EnvironmentOptions> {
    return {
        [BOT_ENVIRONMENT]: {
            build: {
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
    private readonly deps: EdgeBuildDeps;
    private readonly logger = cliLogger('Build');
    private cloudflare?: Promise<CloudflareWorker>;

    constructor(
        project: Project,
        private readonly target: EdgeTarget,
        deps: Partial<EdgeBuildDeps> = {}
    ) {
        super(project);
        this.deps = { ...DEFAULT_DEPS, ...deps };
    }

    public static check({ root, configFile }: ResolvedSeedcordConfig): void {
        if (isInside(root, dirname(configFile))) {
            throw new SeedcordError(SeedcordErrorCode.CliEdgeRootHoldsConfig, [configFile, root]);
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
        const { files } = this.project;
        const [folders, cloudflare] = await Promise.all([files.foldersIncludingEmpty(), this.worker()]);

        const captured = await this.bundleWorker(ids, folders, cloudflare).catch(bundleFailed);
        const chunks =
            captured ??
            bundleFailed(
                `Vite finished without building the ${paint.bold(BOT_ENVIRONMENT)} environment. ${LOOK_FOR_BUILD_PLUGIN}`
            );
        const built = await cloudflare.built().catch(bundleFailed);
        assertNodeCompat(built, this.target.cloudflareConfig);

        return bundleStats(chunks, files.layout, join(built.bundleDir, ENTRY_FILE_NAME));
    }

    private async bundleWorker(
        ids: BakedIds,
        folders: string[],
        cloudflare: CloudflareWorker
    ): Promise<Rolldown.OutputChunk[] | undefined> {
        const { config, files, modules } = this.project;
        const { viteRoot } = this.target;

        let chunks: Rolldown.OutputChunk[] | undefined;
        const builder = await createBuilder({
            // cf deploy --prebuilt reads .cloudflare/output from here
            root: viteRoot,
            mode: config.viteMode,
            configFile: false,
            publicDir: false,
            logLevel: 'warn',
            plugins: [
                workerEntry({
                    layout: files.layout,
                    folders,
                    instanceKey: BotLayout.keyUnder(viteRoot, config.instance),
                    functionExports: () => functionExportsOf(modules, config.instance),
                    rootKey: BotLayout.keyUnder(viteRoot, config.root),
                    mode: { kind: 'build', ids }
                }),
                pinModulePaths(files.layout),
                captureChunks((captured) => {
                    chunks = captured;
                }),
                cloudflare.plugins({ persistState: false }),
                config.vitePlugins.create()
            ],
            resolve: { tsconfigPaths: true },
            environments: workerEnvironment()
        });
        await builder.buildApp();
        return chunks;
    }

    public override async boot(): Promise<void> {
        const cloudflare = await CloudflareWorker.load(this.target, importCloudflareCopy);
        await bootWorker({
            root: this.target.viteRoot,
            mode: this.project.config.viteMode,
            plugins: [cloudflare.plugins({ persistState: false })],
            environments: workerEnvironment()
        });
    }

    public nextCommands(): NextCommand[] {
        return [['deploy', 'cf deploy --prebuilt']];
    }

    private async commandsInCode(commands: CommandsConfig): Promise<CommandsInCode | undefined> {
        if (commands.path === null) return undefined;
        const scanner = new CommandScanner(this.project.modules, this.project.files);
        const found = await scanner.scan(commands.path);
        return { found, configuredGuilds: commands.guilds ?? [] };
    }

    private worker(): Promise<CloudflareWorker> {
        this.cloudflare ??= CloudflareWorker.load(this.target, this.deps.importCloudflare);
        return this.cloudflare;
    }
}
