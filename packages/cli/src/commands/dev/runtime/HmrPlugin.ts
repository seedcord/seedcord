import { relative, resolve } from 'node:path';

import { Logger, StrictEventEmitter } from '@seedcord/services';
import chalk from 'chalk';
import { minimatch } from 'minimatch';

import type { DevEvent } from './events';
import type { HmrEventType, HmrUpdateEvent } from '@api/Hmr';
import type { ResolvedSeedcordDevConfig } from '@core/config/schema';
import type {
    EnvironmentModuleNode,
    HotUpdateOptions,
    ModuleNode,
    NormalizedHotChannel,
    Plugin,
    ViteDevServer
} from 'vite';

const DEBOUNCE_MS = 250;

export class HmrPlugin extends StrictEventEmitter<{ event: [DevEvent] }> {
    private readonly logger: Logger;
    private readonly lastUpdate = new Map<string, number>();
    private server: ViteDevServer | null = null;
    private readonly dynamicRestartPatterns = new Set<string>();

    private get hot(): NormalizedHotChannel | undefined {
        return this.server?.environments.ssr.hot;
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
        if (this.server) {
            if (this.hot) {
                this.hot.send('seedcord:refresh-commands', { shouldRefresh });
            }
        }
    }

    private configureServer(server: ViteDevServer): void {
        this.server = server;
        server.watcher.on('add', (file) => this.handleFileEvent(file, 'create'));
        server.watcher.on('unlink', (file) => this.handleFileEvent(file, 'delete'));
        server.watcher.on('addDir', (file) => this.handleFileEvent(file, 'createDir'));
        server.watcher.on('unlinkDir', (file) => this.handleFileEvent(file, 'deleteDir'));

        if (this.hot) {
            this.hot.on('seedcord:commands-update-prompt', (data) => {
                this.emit('event', { type: 'command-update-prompt', files: data.files });
            });

            this.hot.on('seedcord:register-critical-files', (data) => {
                for (const pattern of data.patterns) {
                    this.dynamicRestartPatterns.add(pattern);
                }

                this.logger.utils.list(data.patterns, 'Registered critical file patterns:');
            });
        }
    }

    // Debounce per (file, type): a rapid create-then-update of the same file is two distinct events, so a
    // single shared timestamp would drop the second. Returns true when the event should be suppressed.
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

        const payload: HmrUpdateEvent = { file, type };

        if (this.hot) {
            this.hot.send('seedcord:hmr', payload);
        }
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
        const allModules = fileModules ? Array.from(fileModules) : [];

        const combinedModules = new Set([...modules, ...allModules]);
        const affectedModules = this.getAffectedModules(Array.from(combinedModules));

        const filesToInvalidate = new Set([file, ...affectedModules]);

        for (const fileToInvalidate of filesToInvalidate) {
            const mods = moduleGraph.getModulesByFile(fileToInvalidate);
            if (mods) {
                for (const mod of mods) {
                    moduleGraph.invalidateModule(mod);
                }
            }
        }

        // file-change tells the runtime to invalidate this module in its evaluated-modules graph.
        this.emit('event', { type: 'file-change', path: file });

        const payload: HmrUpdateEvent = { file, type, affectedModules };

        if (this.hot) {
            this.hot.send('seedcord:hmr', payload);
        }

        // Returning [] suppresses Vite's default client HMR; we drive invalidation through the runtime instead.
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
            if (mod.file && !seen.has(mod.file)) {
                seen.add(mod.file);
                affected.add(mod.file);
                mod.importers.forEach(traverse);
            }
        };

        modules.forEach(traverse);
        return Array.from(affected);
    }
}
