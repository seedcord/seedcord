import { relative, resolve } from 'node:path';

import { wrapHot } from '@seedcord/core/internal';
import { TypedEventEmitter } from '@seedcord/event-emitter';
import { Logger } from '@seedcord/logger';
import chalk from 'chalk';
import { minimatch } from 'minimatch';

import type { DevEvent } from './events';
import type { ResolvedSeedcordDevConfig } from '@core/config/schema';
import type {
    DevChannel,
    HmrEventType,
    HmrUpdateEvent,
    SeedcordCliEvents,
    SeedcordFrameworkEvents
} from '@seedcord/types/internal';
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

        this.dev?.on('seedcord:commands-update-prompt', (data) => {
            this.emit('event', { type: 'command-update-prompt', files: data.files });
        });

        this.dev?.on('seedcord:register-critical-files', (data) => {
            for (const pattern of data.patterns) {
                this.dynamicRestartPatterns.add(pattern);
            }

            this.logger.utils.list(data.patterns, 'Registered critical file patterns:');
        });
    }

    // debounce keyed per (file, type), a shared timestamp drops the second of a rapid create-then-update
    private isDebounced(file: string, type: HmrEventType): boolean {
        const key = `${file}::${type}`;
        const now = Date.now();
        const last = this.lastUpdate.get(key);
        if (last !== undefined && now - last < DEBOUNCE_MS) return true;
        this.lastUpdate.set(key, now);
        return false;
    }

    private handleFileEvent(file: string, type: HmrEventType): void {
        if (this.isDebounced(file, type)) return;

        const relPath = relative(process.cwd(), file);
        const typeColor =
            type === 'create' || type === 'createDir'
                ? chalk.green
                : type === 'delete' || type === 'deleteDir'
                  ? chalk.red
                  : chalk.blue;

        this.logger.info(`${typeColor(type.toUpperCase())} ${chalk.gray(relPath)}`);

        const payload: HmrUpdateEvent = { file, type, rollback: this.config.hmr?.rollback ?? true };

        this.dev?.send('seedcord:hmr', payload);
    }

    private hotUpdate(ctx: HotUpdateOptions): EnvironmentModuleNode[] {
        const { file, modules, server } = ctx;
        const type = 'update';

        if (this.isDebounced(file, type)) return [];

        const relPath = relative(process.cwd(), file);

        this.logger.info(`${chalk.blue(type.toUpperCase())} ${chalk.gray(relPath)}`);

        if (this.isCriticalFile(file)) {
            this.logger.warn(`${chalk.red('Critical file changed:')} ${chalk.bold(relPath)}. Restart required.`);
            this.emit('event', { type: 'restart-required' });
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
