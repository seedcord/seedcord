import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { wrapHot } from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';
import { displayPath } from '@seedcord/errors/internal';
import { TypedEventEmitter } from '@seedcord/event-emitter';
import { Logger } from '@seedcord/logger';
import { workerdPath } from '@seedcord/utils/internal';

import { BOT_ENVIRONMENT, botEnvironment } from '#core/modules/botEnvironment';
import { deployedCommandsFile, lastDeployOf } from '#core/state/deployedCommands';

import { BotImports } from './BotImports';
import { ModuleCode } from './ModuleCode';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { StateFolder } from '#core/state/StateFolder';
import type { DevEvent } from './events';
import type { RestartFiles } from './RestartFiles';
import type { HmrEventType } from '@seedcord/types';
import type { DevChannel, HmrSave, SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';
import type { BotLayout } from '@seedcord/utils/internal';
import type { FSWatcher } from 'node:fs';
import type { Except } from 'type-fest';
import type {
    DevEnvironment,
    EnvironmentModuleNode,
    HotUpdateOptions,
    NormalizedHotChannel,
    Plugin,
    ViteDevServer
} from 'vite';

const DEBOUNCE_MS = 250;

const TYPE_COLOR = {
    create: paint.mint,
    createDir: paint.mint,
    update: paint.sky,
    delete: paint.coral,
    deleteDir: paint.coral
} satisfies Record<HmrEventType, (text: string) => string>;

export class HmrPlugin extends TypedEventEmitter<{ event: [DevEvent] }> {
    private readonly logger: Logger;
    private readonly lastUpdate = new Map<string, number>();
    private botReloadsPlugins = false;
    private readonly code = new ModuleCode();
    private readonly imports: BotImports;
    private readonly restartTimers = new Set<NodeJS.Timeout>();
    private server: ViteDevServer | null = null;
    private restartFilesWatcher?: FSWatcher | undefined;

    private get hot(): NormalizedHotChannel | undefined {
        return this.server?.environments[BOT_ENVIRONMENT]?.hot;
    }

    private get dev(): DevChannel<SeedcordCliEvents, SeedcordFrameworkEvents> | undefined {
        return this.hot ? wrapHot<SeedcordCliEvents, SeedcordFrameworkEvents>(this.hot) : undefined;
    }

    constructor(
        private readonly config: ResolvedSeedcordConfig,
        private readonly state: StateFolder,
        private readonly restartFiles: RestartFiles,
        private readonly layout: BotLayout
    ) {
        super();
        this.logger = new Logger('HMR', { channel: 'hmr' });
        this.imports = new BotImports(config.instance);
    }

    public get plugin(): Plugin {
        const onHotUpdate = this.hotUpdate.bind(this);
        const { restartFiles } = this;
        return {
            name: 'seedcord:hmr',
            config: () => ({ server: { watch: { ignored: [restartFiles.hiddenFromVite] } } }),
            configureServer: this.configureServer.bind(this),
            applyToEnvironment: (environment) => environment.name === BOT_ENVIRONMENT,
            transform: this.code.transform,
            hotUpdate(ctx) {
                return onHotUpdate(this.environment, ctx);
            }
        };
    }

    public sendRefreshCommands(shouldRefresh: boolean): void {
        this.dev?.send('seedcord:refresh-commands', { shouldRefresh });
    }

    public close(): void {
        for (const timer of this.restartTimers) clearTimeout(timer);
        this.restartFilesWatcher?.close();
        this.removeAllListeners('event');
    }

    private reportChangeNeedingRestart(file: string): void {
        if (this.isDebounced(file, 'update')) return;
        this.reportRestartRequired(file);
    }

    private configureServer(server: ViteDevServer): void {
        this.server = server;
        const bot = botEnvironment(server.environments);
        this.restartFilesWatcher = this.restartFiles.watch((file) => {
            this.reportChangeNeedingRestart(resolve(file));
        });
        // vite calls hotUpdate for files only
        server.watcher.on('addDir', (dir) => this.handleDirEvent(resolve(dir), 'createDir'));
        server.watcher.on('unlinkDir', (dir) => this.handleDirEvent(resolve(dir), 'deleteDir'));

        this.dev?.on('seedcord:commands-update-prompt', (data) => {
            this.emit('event', { type: 'command-update-prompt', files: data.files });
        });

        this.dev?.on('seedcord:server-port', (data) => {
            this.emit('event', { type: 'server-port', port: data.port });
        });

        this.dev?.on('seedcord:read-deployed', ({ applicationId }) => {
            this.dev?.send('seedcord:last-deploy', { deployed: lastDeployOf(this.state, applicationId) });
        });

        this.dev?.on('seedcord:commands-deployed', (deployed) => {
            this.state.write(deployedCommandsFile, deployed);
        });

        this.dev?.on('seedcord:register-critical-files', (data) => {
            this.restartFiles.addPatterns(data.patterns);
            this.logger.debug(`Registered ${String(data.patterns.length)} critical file patterns`);
        });

        // saving a file after this imports a second copy of the framework and breaks the instanceof checks
        this.dev?.on('seedcord:full-reload', () => {
            this.requireRestart(paint.coral('Vite reloaded every module.'));
        });

        this.dev?.on('seedcord:read-bot-imports', () => {
            this.botReloadsPlugins = true;
            this.imports.names(bot).then(
                (imports) =>
                    this.dev?.send('seedcord:bot-imports', {
                        imports: imports.map(({ file, names }) => ({ file: this.botPath(file), names }))
                    }),
                (error: unknown) => this.logger.error('Failed to read what the bot file imports', error)
            );
        });

        this.dev?.on('seedcord:restart-required', ({ file }) => {
            this.reportRestartRequired(file);
        });
    }

    // per type because an atomic save sends a delete then a create for the same file
    private isDebounced(file: string, type: HmrEventType): boolean {
        const key = `${file}::${type}`;
        const last = this.lastUpdate.get(key);
        if (last !== undefined && Date.now() - last < DEBOUNCE_MS) return true;

        this.lastUpdate.set(key, Date.now());
        return false;
    }

    private reportRestartRequired(file: string): void {
        this.requireRestart(`${paint.coral('Critical file changed:')} ${paint.sky.bold(displayPath(file))}.`);
    }

    private requireRestart(reason: string): void {
        this.logger.warn(`${reason} Restart required.`);
        this.emit('event', { type: 'restart-required' });
    }

    private handleDirEvent(dir: string, type: 'createDir' | 'deleteDir'): void {
        if (this.isDebounced(dir, type)) return;
        this.send({ file: dir, type });
    }

    private send(save: Except<HmrSave, 'rollback'>): void {
        this.logger.trace(`${TYPE_COLOR[save.type](save.type.toUpperCase())} ${paint.mute(displayPath(save.file))}`);
        this.dev?.send('seedcord:hmr', {
            ...save,
            file: this.botPath(save.file),
            ...(save.affectedModules && { affectedModules: save.affectedModules.map((path) => this.botPath(path)) }),
            rollback: this.config.hmr?.rollback ?? true
        });
    }

    private botPath(hostPath: string): string {
        return this.config.target.kind === 'edge' ? workerdPath(hostPath) : hostPath;
    }

    // vite passes file paths with forward slashes on windows
    private async hotUpdate(environment: DevEnvironment, ctx: HotUpdateOptions): Promise<EnvironmentModuleNode[]> {
        const file = resolve(ctx.file);
        if (this.isDebounced(file, ctx.type)) return [];

        const type = deleteIfGone(ctx.type, file);
        const modules =
            type === 'delete' ? this.code.forget(ctx.modules) : await this.code.changed(environment, ctx.modules);
        // the bot would run the same code as before
        if (ctx.modules.length > 0 && modules.length === 0) return [];

        const chain = affectedFiles(ctx.file, modules).map((viteFile) => ({ viteFile, file: resolve(viteFile) }));
        // importing the bot file again would build a second bot
        const reloadable = chain.filter((link) => !this.restartFiles.isBotFile(link.file));
        const reachesBot = reloadable.length < chain.length;
        if (
            this.needsRestart(
                file,
                chain.map((link) => link.file),
                reachesBot
            )
        ) {
            this.reportRestartRequired(file);
            return [];
        }

        const { moduleGraph } = environment;
        for (const { viteFile } of reloadable) {
            for (const mod of moduleGraph.getModulesByFile(viteFile) ?? []) moduleGraph.invalidateModule(mod);
        }

        if (!this.botMightLoad(file, modules)) return [];

        const affectedModules = reloadable.map((link) => link.file);
        if (!reachesBot || type === 'delete') {
            this.send({ file, type, affectedModules });
            if (reachesBot) this.restartUnlessWrittenAgain(file);
            return [];
        }
        const [first, ...rest] = this.imports.among(moduleGraph, affectedModules).map((path) => this.botPath(path));
        // empty when the bot file imports the saved file with a query, like './notes.md?raw'. BotImports skips query imports
        if (first === undefined) this.reportRestartRequired(file);
        else this.send({ file, type, affectedModules, botImports: [first, ...rest] });

        // [] skips vite's own hmr
        return [];
    }

    // until the bot asks for its imports, it can't replace a plugin
    private needsRestart(saved: string, chain: readonly string[], reachesBot: boolean): boolean {
        return (reachesBot && !this.botReloadsPlugins) || this.restartFiles.needsRestart(saved, chain);
    }

    // an atomic save deletes the file and writes it again right after. the bot replaces the plugins on that write
    private restartUnlessWrittenAgain(file: string): void {
        const timer = setTimeout(() => {
            this.restartTimers.delete(timer);
            if (!existsSync(file)) this.reportRestartRequired(file);
        }, DEBOUNCE_MS).unref();
        this.restartTimers.add(timer);
    }

    // the bot can still read a file it doesn't import, like a new handler or a folder a plugin's onHmr watches
    private botMightLoad(file: string, modules: readonly EnvironmentModuleNode[]): boolean {
        return modules.length > 0 || !this.layout.isSkipped(file);
    }
}

// workerd can't read the project's files
function deleteIfGone(type: HotUpdateOptions['type'], file: string): HotUpdateOptions['type'] {
    return type === 'update' && !existsSync(file) ? 'delete' : type;
}

// vite can hold several modules for one file. each one has its own importers
// an importer that loads the file with import() counts too because that line may never run again
function affectedFiles(file: string, modules: EnvironmentModuleNode[]): string[] {
    const files = new Set([file]);
    const visited = new Set<EnvironmentModuleNode>();

    const visit = (mod: EnvironmentModuleNode): void => {
        if (visited.has(mod)) return;
        visited.add(mod);
        if (mod.file) files.add(mod.file);
        mod.importers.forEach(visit);
    };

    modules.forEach(visit);
    return [...files];
}
