import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { wrapHot } from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';
import { displayPath } from '@seedcord/errors/internal';
import { TypedEventEmitter } from '@seedcord/event-emitter';
import { Logger } from '@seedcord/logger';
import { workerdPath } from '@seedcord/utils/internal';

import { deployedCommandsFile, lastDeployOf } from '#core/state/deployedCommands';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { StateFolder } from '#core/state/StateFolder';
import type { DevEvent } from './events';
import type { RestartFiles } from './RestartFiles';
import type { HmrEventType, HmrUpdateEvent, TypedOmit } from '@seedcord/types';
import type { DevChannel, SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';
import type { FSWatcher } from 'node:fs';
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

        this.dev?.on('seedcord:server-listening', (data) => {
            this.emit('event', { type: 'server-listening', port: data.port });
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
    }

    // per type, because an atomic save sends a delete then a create for the same file
    private isDebounced(file: string, type: HmrEventType): boolean {
        const key = `${file}::${type}`;
        const last = this.lastUpdate.get(key);
        if (last !== undefined && Date.now() - last < DEBOUNCE_MS) return true;

        this.lastUpdate.set(key, Date.now());
        return false;
    }

    private reportRestartRequired(file: string): void {
        this.logger.warn(
            `${paint.coral('Critical file changed:')} ${paint.sky.bold(displayPath(file))}. Restart required.`
        );
        this.emit('event', { type: 'restart-required' });
    }

    private handleDirEvent(dir: string, type: 'createDir' | 'deleteDir'): void {
        if (this.isDebounced(dir, type)) return;
        this.send({ file: dir, type });
    }

    private send(event: TypedOmit<HmrUpdateEvent, 'rollback'>): void {
        this.logger.trace(`${TYPE_COLOR[event.type](event.type.toUpperCase())} ${paint.mute(displayPath(event.file))}`);
        this.dev?.send('seedcord:hmr', {
            ...event,
            file: this.botPath(event.file),
            ...(event.affectedModules && { affectedModules: event.affectedModules.map((path) => this.botPath(path)) }),
            rollback: this.config.hmr?.rollback ?? true
        });
    }

    private botPath(hostPath: string): string {
        return this.config.target.kind === 'edge' ? workerdPath(hostPath) : hostPath;
    }

    // vite passes file paths with forward slashes on windows
    private hotUpdate(environment: DevEnvironment, ctx: HotUpdateOptions): EnvironmentModuleNode[] {
        const { type, modules } = ctx;
        const file = resolve(ctx.file);
        if (environment.name !== this.botEnvironment || this.isDebounced(file, type)) return [];

        const viteFiles = affectedFiles(ctx.file, modules);
        const affectedModules = viteFiles.map((affected) => resolve(affected));
        if (affectedModules.some((affected) => this.restartFiles.needsRestart(affected))) {
            this.reportRestartRequired(file);
            return [];
        }

        const { moduleGraph } = environment;
        for (const target of viteFiles) {
            for (const mod of moduleGraph.getModulesByFile(target) ?? []) moduleGraph.invalidateModule(mod);
        }

        this.send({ file, type: deleteIfGone(type, file), affectedModules });

        // [] skips vite's own hmr
        return [];
    }
}

// workerd has no access to the project's files
function deleteIfGone(type: HotUpdateOptions['type'], file: string): HotUpdateOptions['type'] {
    return type === 'update' && !existsSync(file) ? 'delete' : type;
}

// vite can hold several modules for one file, each with its own importers
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
