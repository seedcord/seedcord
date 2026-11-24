import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { wrapHot } from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';
import { displayPath } from '@seedcord/errors/internal';
import { TypedEventEmitter } from '@seedcord/event-emitter';
import { Logger } from '@seedcord/logger';
import { workerdPath } from '@seedcord/utils/internal';
import { normalizePath } from 'vite';

import { deployedCommandsFile, lastDeployOf } from '#core/state/deployedCommands';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { StateFolder } from '#core/state/StateFolder';
import type { DevEvent } from './events';
import type { RestartFiles } from './RestartFiles';
import type { HmrEventType } from '@seedcord/types';
import type { DevChannel, HmrSave, SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';
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
    // a bot asks for the files its bot file imports once every plugin has started.
    // until then, saving a file that the bot file imports, directly or through another file, shows the restart card
    private botReloadsPlugins = false;
    private server: ViteDevServer | null = null;
    private restartFilesWatcher?: FSWatcher | undefined;

    private get hot(): NormalizedHotChannel | undefined {
        return this.server?.environments[this.botEnvironment]?.hot;
    }

    private get dev(): DevChannel<SeedcordCliEvents, SeedcordFrameworkEvents> | undefined {
        return this.hot ? wrapHot<SeedcordCliEvents, SeedcordFrameworkEvents>(this.hot) : undefined;
    }

    constructor(
        private readonly config: ResolvedSeedcordConfig,
        private readonly state: StateFolder,
        private readonly botEnvironment: string,
        private readonly restartFiles: RestartFiles
    ) {
        super();
        this.logger = new Logger('HMR', { channel: 'hmr' });
    }

    public get plugin(): Plugin {
        const onHotUpdate = this.hotUpdate.bind(this);
        const { restartFiles } = this;
        return {
            name: 'seedcord:hmr',
            config: () => ({ server: { watch: { ignored: [restartFiles.hiddenFromVite] } } }),
            configureServer: this.configureServer.bind(this),
            hotUpdate(ctx) {
                return onHotUpdate(this.environment, ctx);
            }
        };
    }

    public sendRefreshCommands(shouldRefresh: boolean): void {
        this.dev?.send('seedcord:refresh-commands', { shouldRefresh });
    }

    public close(): void {
        this.restartFilesWatcher?.close();
        this.removeAllListeners('event');
    }

    private reportChangeNeedingRestart(file: string): void {
        if (this.isDebounced(file, 'update')) return;
        this.reportRestartRequired(file);
    }

    private configureServer(server: ViteDevServer): void {
        this.server = server;
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

        // a save after this imports a second copy of the framework and breaks the instanceof checks
        this.dev?.on('seedcord:full-reload', () => {
            this.requireRestart(paint.coral('Vite reloaded every module.'));
        });

        this.dev?.on('seedcord:read-bot-imports', () => {
            this.botReloadsPlugins = true;
            this.dev?.send('seedcord:bot-imports', { files: this.botImports().map((file) => this.botPath(file)) });
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
        const botPaths = (paths: string[]): string[] => paths.map((path) => this.botPath(path));
        this.dev?.send('seedcord:hmr', {
            ...save,
            file: this.botPath(save.file),
            ...(save.affectedModules && { affectedModules: botPaths(save.affectedModules) }),
            ...(save.botImports && { botImports: botPaths(save.botImports) }),
            rollback: this.config.hmr?.rollback ?? true
        });
    }

    private botPath(hostPath: string): string {
        return this.config.target.kind === 'edge' ? workerdPath(hostPath) : hostPath;
    }

    // vite passes file paths with forward slashes on windows
    private hotUpdate(environment: DevEnvironment, ctx: HotUpdateOptions): EnvironmentModuleNode[] {
        const { modules } = ctx;
        const file = resolve(ctx.file);
        if (environment.name !== this.botEnvironment || this.isDebounced(file, ctx.type)) return [];

        const chain = affectedFiles(ctx.file, modules).map((viteFile) => ({ viteFile, file: resolve(viteFile) }));
        // importing the bot file again would build a second bot
        const reloadable = chain.filter((link) => !this.restartFiles.isBotFile(link.file));
        const reachesBot = reloadable.length < chain.length;
        if (
            reloadable.some((link) => this.restartFiles.needsRestart(link.file)) ||
            (reachesBot && (!this.botReloadsPlugins || this.restartFiles.isBotFile(file)))
        ) {
            this.reportRestartRequired(file);
            return [];
        }

        const { moduleGraph } = environment;
        for (const { viteFile } of reloadable) {
            for (const mod of moduleGraph.getModulesByFile(viteFile) ?? []) moduleGraph.invalidateModule(mod);
        }

        const type = deleteIfGone(ctx.type, file);
        const affectedModules = reloadable.map((link) => link.file);
        // an atomic save deletes the file first. the bot replaces the plugins on the create that follows
        const botImports = reachesBot && type !== 'delete' ? this.importedByBot(affectedModules) : undefined;
        this.send({ file, type, affectedModules, ...(botImports && { botImports }) });

        // [] skips vite's own hmr
        return [];
    }

    private importedByBot(files: readonly string[]): string[] {
        const imports = new Set(this.botImports());
        return files.filter((file) => imports.has(file));
    }

    // this skips a file in node_modules because the bot would run a second copy of that package to read it
    private botImports(): string[] {
        const graph = this.server?.environments[this.botEnvironment]?.moduleGraph;
        const botModules = graph?.getModulesByFile(normalizePath(this.config.instance)) ?? [];
        const files = [...botModules].flatMap((mod) => [...mod.importedModules].map((imported) => imported.file));
        return [...new Set(files)]
            .filter((file): file is string => typeof file === 'string' && !file.includes('/node_modules/'))
            .map((file) => resolve(file));
    }
}

// workerd can't read the project's files
function deleteIfGone(type: HotUpdateOptions['type'], file: string): HotUpdateOptions['type'] {
    return type === 'update' && !existsSync(file) ? 'delete' : type;
}

// vite can hold several modules for one file, each with its own importers.
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
