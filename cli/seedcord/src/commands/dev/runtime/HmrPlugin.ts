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

export class HmrPlugin extends TypedEventEmitter<{ event: [DevEvent] }> {
    private readonly logger: Logger;
    private readonly lastUpdate = new Map<string, number>();
    private readonly awaitingCreateEcho = new Set<string>();
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
        server.watcher.on('add', (file) => this.handleFileEvent(file, 'create'));
        server.watcher.on('unlink', (file) => this.handleFileEvent(file, 'delete'));
        server.watcher.on('addDir', (file) => this.handleFileEvent(file, 'createDir'));
        server.watcher.on('unlinkDir', (file) => this.handleFileEvent(file, 'deleteDir'));

        // vite's watcher covers config.root only, which excludes the config file
        server.watcher.add(this.config.configFile);
        server.watcher.on('change', (file) => this.handleChange(file));

        this.dev?.on('seedcord:commands-update-prompt', (data) => {
            this.emit('event', { type: 'command-update-prompt', files: data.files });
        });

        this.dev?.on('seedcord:server-listening', (data) => {
            this.emit('event', { type: 'server-listening', port: data.port });
        });

        this.dev?.on('seedcord:register-critical-files', (data) => {
            for (const pattern of data.patterns) {
                this.dynamicRestartPatterns.add(pattern);
            }

            this.logger.debug(`Registered ${String(data.patterns.length)} critical file patterns`);
        });
    }

    // keyed per type, else an atomic-save rename (unlink then add) loses the add and the handler stays unloaded
    private isDebounced(file: string, type: HmrEventType): boolean {
        if (this.justSaw(file, type)) return true;
        this.lastUpdate.set(`${file}::${type}`, Date.now());
        return false;
    }

    private justSaw(file: string, type: HmrEventType): boolean {
        const last = this.lastUpdate.get(`${file}::${type}`);
        return last !== undefined && Date.now() - last < DEBOUNCE_MS;
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

    private handleFileEvent(file: string, type: HmrEventType): void {
        if (this.isDebounced(file, type)) return;
        if (type === 'create') this.awaitingCreateEcho.add(file);

        const relPath = relative(process.cwd(), file);
        const typeColor =
            type === 'create' || type === 'createDir'
                ? paint.mint
                : type === 'delete' || type === 'deleteDir'
                  ? paint.coral
                  : paint.sky;

        this.logger.trace(`${typeColor(type.toUpperCase())} ${paint.mute(relPath)}`);

        const payload: HmrUpdateEvent = { file, type, rollback: this.config.hmr?.rollback ?? true };

        this.dev?.send('seedcord:hmr', payload);
    }

    private hotUpdate(ctx: HotUpdateOptions): EnvironmentModuleNode[] {
        const { file, modules, server } = ctx;
        const type = 'update';

        // vite fires one update straight after the watcher's add, and the create already reloaded the file
        const isCreateEcho = this.awaitingCreateEcho.delete(file) && this.justSaw(file, 'create');
        if (isCreateEcho || this.isDebounced(file, type)) return [];

        const relPath = relative(process.cwd(), file);

        this.logger.trace(`${paint.sky(type.toUpperCase())} ${paint.mute(relPath)}`);

        if (this.isCriticalFile(file)) {
            this.reportRestartRequired(file);
            return [];
        }

        const moduleGraph = server.moduleGraph;
        const fileModules = moduleGraph.getModulesByFile(file);
        const allModules = fileModules ? [...fileModules] : [];

        const combinedModules = new Set([...modules, ...allModules]);
        const affectedModules = this.getAffectedModules([...combinedModules]);

        const filesToInvalidate = new Set([file, ...affectedModules]);

        for (const fileToInvalidate of filesToInvalidate) {
            const mods = moduleGraph.getModulesByFile(fileToInvalidate);
            if (mods) {
                for (const mod of mods) {
                    moduleGraph.invalidateModule(mod);
                }
            }
        }

        // the runtime invalidates this module in its evaluated-modules graph on a file-change event.
        this.emit('event', { type: 'file-change', path: file });

        const payload: HmrUpdateEvent = { file, type, affectedModules, rollback: this.config.hmr?.rollback ?? true };

        this.dev?.send('seedcord:hmr', payload);

        // returning [] suppresses vite's default client HMR so invalidation runs through the runtime.
        return [];
    }

    private isCriticalFile(file: string): boolean {
        const root = this.config.root;
        const relPath = relative(root, file);

        if (this.config.hmr?.restart) {
            for (const pattern of this.config.hmr.restart) {
                if (minimatch(relPath, pattern)) {
                    return true;
                }
            }
        }

        for (const pattern of this.dynamicRestartPatterns) {
            if (minimatch(relPath, pattern)) {
                return true;
            }
        }

        if (
            file === this.config.configFile ||
            file.endsWith('package.json') ||
            file.endsWith('tsconfig.json') ||
            file.endsWith('.env')
        ) {
            return true;
        }

        const entryPath = resolve(root, this.config.entry);
        const instancePath = resolve(root, this.config.instance);

        if (file === entryPath || file === instancePath) {
            return true;
        }

        return false;
    }

    private getAffectedModules(modules: (EnvironmentModuleNode | ModuleNode)[]): string[] {
        const affected = new Set<string>();
        const seen = new Set<string>();

        const traverse = (mod: EnvironmentModuleNode | ModuleNode): void => {
            if (!mod.file || seen.has(mod.file)) return;

            seen.add(mod.file);
            affected.add(mod.file);
            mod.importers.forEach(traverse);
        };

        modules.forEach(traverse);
        return [...affected];
    }
}
