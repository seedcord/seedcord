import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { wrapHot } from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';
import { displayPath } from '@seedcord/errors/internal';
import { TypedEventEmitter } from '@seedcord/event-emitter';
import { Logger } from '@seedcord/logger';
import { workerdPath } from '@seedcord/utils/internal';
import { filterAsync, flatMapAsync, uniq } from 'es-toolkit';
import { normalizePath } from 'vite';

import { deployedCommandsFile, lastDeployOf } from '#core/state/deployedCommands';

import { importedNames } from './importedNames';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { StateFolder } from '#core/state/StateFolder';
import type { DevEvent } from './events';
import type { RestartFiles } from './RestartFiles';
import type { HmrEventType } from '@seedcord/types';
import type {
    BotImport,
    DevChannel,
    HmrSave,
    SeedcordCliEvents,
    SeedcordFrameworkEvents
} from '@seedcord/types/internal';
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
    // vite empties transformResult before hotUpdate. the mappings are kept too because a blank line shifts the lines in a stack trace
    private readonly botCode = new Map<string, { code: string; mappings: string }>();
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
        private readonly restartFiles: RestartFiles,
        private readonly layout: BotLayout
    ) {
        super();
        this.logger = new Logger('HMR', { channel: 'hmr' });
    }

    public get plugin(): Plugin {
        const onHotUpdate = this.hotUpdate.bind(this);
        const { restartFiles, botCode, botEnvironment } = this;
        return {
            name: 'seedcord:hmr',
            config: () => ({ server: { watch: { ignored: [restartFiles.hiddenFromVite] } } }),
            configureServer: this.configureServer.bind(this),
            applyToEnvironment: (environment) => environment.name === botEnvironment,
            transform: {
                order: 'post',
                handler(code, id) {
                    botCode.set(id, { code, mappings: this.getCombinedSourcemap().mappings });
                }
            },
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

        // saving a file after this imports a second copy of the framework and breaks the instanceof checks
        this.dev?.on('seedcord:full-reload', () => {
            this.requireRestart(paint.coral('Vite reloaded every module.'));
        });

        this.dev?.on('seedcord:read-bot-imports', () => {
            this.botReloadsPlugins = true;
            this.botImportNames().then(
                (imports) => this.dev?.send('seedcord:bot-imports', { imports }),
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
        const modules = type === 'delete' ? ctx.modules : await this.withNewCode(environment, ctx.modules);
        // the bot would run the same code as before
        if (ctx.modules.length > 0 && modules.length === 0) return [];

        const chain = affectedFiles(ctx.file, modules).map((viteFile) => ({ viteFile, file: resolve(viteFile) }));
        if (
            this.restartFiles.needsRestart(
                file,
                chain.map((link) => link.file),
                this.botReloadsPlugins
            )
        ) {
            this.reportRestartRequired(file);
            return [];
        }
        // importing the bot file again would build a second bot
        const reloadable = chain.filter((link) => !this.restartFiles.isBotFile(link.file));
        const reachesBot = reloadable.length < chain.length;

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
        const [first, ...rest] = this.importedByBot(affectedModules).map((path) => this.botPath(path));
        // empty when the bot file imports the saved file with a query, like './notes.md?raw'. botImports() skips query imports
        if (first === undefined) this.reportRestartRequired(file);
        else this.send({ file, type, affectedModules, botImports: [first, ...rest] });

        // [] skips vite's own hmr
        return [];
    }

    // an atomic save deletes the file and writes it again right after. the bot replaces the plugins on that write
    private restartUnlessWrittenAgain(file: string): void {
        setTimeout(() => {
            if (!existsSync(file)) this.reportRestartRequired(file);
        }, DEBOUNCE_MS).unref();
    }

    // a new handler under root isn't in the bot's imports yet
    private botMightLoad(file: string, modules: readonly EnvironmentModuleNode[]): boolean {
        return modules.length > 0 || (this.layout.holds(file) && !this.layout.isSkipped(file));
    }

    // a ?url import is just the file's path. editing the file doesn't change it
    private withNewCode(
        environment: DevEnvironment,
        modules: EnvironmentModuleNode[]
    ): Promise<EnvironmentModuleNode[]> {
        return filterAsync(modules, async ({ id, url }) => {
            if (id === null) return true;
            const before = this.botCode.get(id);
            if (!before) return true;
            // a failed transform counts as a change. the bot unregisters a deleted file and reports a syntax error
            const transformed = await environment.transformRequest(url).then(
                () => true,
                () => false
            );
            const after = this.botCode.get(id);
            return !transformed || after?.code !== before.code || after.mappings !== before.mappings;
        });
    }

    private async botImportNames(): Promise<BotImport[]> {
        const { instance } = this.config;
        const environment = this.server?.environments[this.botEnvironment];
        const imported = new Set(this.botImports());
        const read = importedNames(await readFile(instance, 'utf8'), instance);
        return flatMapAsync([...read], async ([source, names]) => {
            const resolvedId = await environment?.pluginContainer.resolveId(source, instance);
            const file = resolvedId ? resolve(resolvedId.id) : undefined;
            return file !== undefined && imported.has(file) ? [{ file: this.botPath(file), names }] : [];
        });
    }

    private importedByBot(files: readonly string[]): string[] {
        const imports = new Set(this.botImports());
        return files.filter((file) => imports.has(file));
    }

    // a ?raw module isn't the file's code. a node_modules file would load a second copy of its package
    private botImports(): string[] {
        const graph = this.server?.environments[this.botEnvironment]?.moduleGraph;
        const botModules = graph?.getModulesByFile(normalizePath(this.config.instance)) ?? [];
        const files = [...botModules].flatMap((mod) =>
            [...mod.importedModules].flatMap(({ id, file }) =>
                file !== null && id === file && !file.includes('/node_modules/') ? [resolve(file)] : []
            )
        );
        return uniq(files);
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
