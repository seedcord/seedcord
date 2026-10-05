import { relative, resolve } from 'node:path';

import { wrapHot } from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';
import { TypedEventEmitter } from '@seedcord/event-emitter';
import { Logger } from '@seedcord/logger';
import { minimatch } from 'minimatch';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';
import type { DevEvent } from './events';
import type { HmrEventType, HmrUpdateEvent } from '@seedcord/types';
import type { DevChannel, SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';
import type {
    EnvironmentModuleNode,
    HotUpdateOptions,
    ModuleNode,
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
    private readonly dynamicRestartPatterns = new Set<string>();

    private get hot(): NormalizedHotChannel | undefined {
        return this.server?.environments.ssr.hot;
    }

    private get dev(): DevChannel<SeedcordCliEvents, SeedcordFrameworkEvents> | undefined {
        return this.hot ? wrapHot<SeedcordCliEvents, SeedcordFrameworkEvents>(this.hot) : undefined;
    }

    constructor(private readonly config: ResolvedSeedcordDevConfig) {
        super();
        this.logger = new Logger('HMR', { channel: 'hmr' });
    }

    public get plugin(): Plugin {
        return {
            name: 'seedcord:hmr',
            configureServer: this.configureServer.bind(this),
            hotUpdate: this.hotUpdate.bind(this)
        };
    }

    public sendRefreshCommands(shouldRefresh: boolean): void {
        this.dev?.send('seedcord:refresh-commands', { shouldRefresh });
    }

    private configureServer(server: ViteDevServer): void {
        this.server = server;
        // vite calls hotUpdate for files only
        server.watcher.on('addDir', (dir) => this.handleDirEvent(dir, 'createDir'));
        server.watcher.on('unlinkDir', (dir) => this.handleDirEvent(dir, 'deleteDir'));

        // vite watches config.root only
        server.watcher.add(this.config.configFile);
        server.watcher.on('change', (file) => this.handleChange(file));

        this.dev?.on('seedcord:commands-update-prompt', (data) => {
            this.emit('event', { type: 'command-update-prompt', files: data.files });
        });

        this.dev?.on('seedcord:server-listening', (data) => {
            this.emit('event', { type: 'server-listening', port: data.port });
        });

        this.dev?.on('seedcord:register-critical-files', (data) => {
            for (const pattern of data.patterns) this.dynamicRestartPatterns.add(pattern);
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

    // hotUpdate covers a critical file inside the root
    private handleChange(file: string): void {
        if (!this.isCriticalFile(file) || this.isDebounced(file, 'update')) return;
        this.reportRestartRequired(file);
    }

    private reportRestartRequired(file: string): void {
        const relPath = relative(process.cwd(), file);
        this.logger.warn(`${paint.coral('Critical file changed:')} ${paint.sky.bold(relPath)}. Restart required.`);
        this.emit('event', { type: 'restart-required' });
    }

    private handleDirEvent(dir: string, type: 'createDir' | 'deleteDir'): void {
        if (this.isDebounced(dir, type)) return;
        this.send({ file: dir, type, rollback: this.config.hmr?.rollback ?? true });
    }

    private send(payload: HmrUpdateEvent): void {
        const relPath = relative(process.cwd(), payload.file);
        this.logger.trace(`${TYPE_COLOR[payload.type](payload.type.toUpperCase())} ${paint.mute(relPath)}`);
        this.dev?.send('seedcord:hmr', payload);
    }

    // vite calls this once per environment for each file event
    private hotUpdate(ctx: HotUpdateOptions): EnvironmentModuleNode[] {
        const { type, file, modules, server } = ctx;
        if (this.isDebounced(file, type)) return [];

        if (this.isCriticalFile(file)) {
            this.reportRestartRequired(file);
            return [];
        }

        const { moduleGraph } = server;
        const affectedModules = this.getAffectedModules([...modules, ...(moduleGraph.getModulesByFile(file) ?? [])]);

        for (const target of new Set([file, ...affectedModules])) {
            for (const mod of moduleGraph.getModulesByFile(target) ?? []) moduleGraph.invalidateModule(mod);
        }

        this.emit('event', { type: 'file-change', path: file });
        this.send({ file, type, affectedModules, rollback: this.config.hmr?.rollback ?? true });

        // [] skips vite's own hmr
        return [];
    }

    private isCriticalFile(file: string): boolean {
        const { root, configFile, entry, instance } = this.config;
        const relPath = relative(root, file);
        const patterns = [...(this.config.hmr?.restart ?? []), ...this.dynamicRestartPatterns];

        return (
            patterns.some((pattern) => minimatch(relPath, pattern)) ||
            file === configFile ||
            file.endsWith('package.json') ||
            file.endsWith('tsconfig.json') ||
            file.endsWith('.env') ||
            file === resolve(root, entry) ||
            file === resolve(root, instance)
        );
    }

    private getAffectedModules(modules: (EnvironmentModuleNode | ModuleNode)[]): string[] {
        const affected = new Set<string>();

        const traverse = (mod: EnvironmentModuleNode | ModuleNode): void => {
            if (!mod.file || affected.has(mod.file)) return;
            affected.add(mod.file);
            mod.importers.forEach(traverse);
        };

        modules.forEach(traverse);
        return [...affected];
    }
}
