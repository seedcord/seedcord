import { relative, resolve } from 'node:path';

import { Logger, StrictEventEmitter } from '@seedcord/services';
import chalk from 'chalk';
import { minimatch } from 'minimatch';

import { HMR_EVENT_NAME } from '@api/Hmr';

import type { HmrEventType, HmrUpdateEvent } from '@api/Hmr';
import type { ResolvedSeedcordDevConfig } from '@core/config/schema';
import type { EnvironmentModuleNode, HotUpdateOptions, ModuleNode, Plugin, ViteDevServer } from 'vite';

const DEBOUNCE_MS = 250;

export interface HmrPluginEvents {
    invalidate: [file: string];
    'restart-needed': [file: string];
    'command-update-prompt': [file: string];
}

export class HmrPlugin extends StrictEventEmitter<HmrPluginEvents> {
    private readonly logger: Logger;
    private lastUpdate: { file: string; time: number } | null = null;
    private server: ViteDevServer | null = null;
    private readonly dynamicRestartPatterns = new Set<string>();

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

    public sendRefreshCommands(): void {
        if (this.server) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            const hot = this.server.environments?.ssr?.hot ?? this.server.hot;
            hot.send('seedcord:refresh-commands');
        }
    }

    private configureServer(server: ViteDevServer): void {
        this.server = server;
        server.watcher.on('add', (file) => this.handleFileEvent(server, file, 'create'));
        server.watcher.on('unlink', (file) => this.handleFileEvent(server, file, 'delete'));
        server.watcher.on('addDir', (file) => this.handleFileEvent(server, file, 'createDir'));
        server.watcher.on('unlinkDir', (file) => this.handleFileEvent(server, file, 'deleteDir'));

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const hot = server.environments?.ssr?.hot ?? server.hot;
        hot.on('seedcord:commands-update-prompt', (data: { file: string }) => {
            this.emit('command-update-prompt', data.file);
        });

        hot.on('seedcord:register-critical-files', (data: { patterns: string[] }) => {
            for (const pattern of data.patterns) {
                this.dynamicRestartPatterns.add(pattern);
            }
            this.logger.debug(`Registered critical file patterns: ${data.patterns.join(', ')}`);
        });
    }

    private handleFileEvent(server: ViteDevServer, file: string, type: HmrEventType): void {
        // Debounce rapid updates to the same file
        const now = Date.now();
        if (this.lastUpdate?.file === file && now - this.lastUpdate.time < DEBOUNCE_MS) {
            return;
        }
        this.lastUpdate = { file, time: now };

        const relPath = relative(process.cwd(), file);
        const typeColor =
            type === 'create' || type === 'createDir'
                ? chalk.green
                : type === 'delete' || type === 'deleteDir'
                  ? chalk.red
                  : chalk.blue;

        this.logger.info(`${typeColor(type.toUpperCase())} ${chalk.gray(relPath)}`);

        const payload: HmrUpdateEvent = { file, type };

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const hot = server.environments?.ssr?.hot ?? server.hot;
        hot.send(HMR_EVENT_NAME, payload);
    }

    // eslint-disable-next-line max-statements
    private hotUpdate(ctx: HotUpdateOptions): EnvironmentModuleNode[] {
        const { file, modules, server } = ctx;
        const now = Date.now();

        // Debounce rapid updates to the same file
        if (this.lastUpdate?.file === file && now - this.lastUpdate.time < DEBOUNCE_MS) {
            return [];
        }
        this.lastUpdate = { file, time: now };

        const relPath = relative(process.cwd(), file);
        const type = 'update';
        const typeColor = chalk.blue;

        this.logger.info(`${typeColor(type.toUpperCase())} ${chalk.gray(relPath)}`);

        // Check for critical files
        if (this.isCriticalFile(file)) {
            this.logger.warn(`Critical file changed: ${chalk.bold(relPath)}. Restart required.`);
            this.emit('restart-needed', file);
            return [];
        }

        // Get all modules associated with this file from the graph
        const moduleGraph = server.moduleGraph;
        const fileModules = moduleGraph.getModulesByFile(file);
        const allModules = fileModules ? Array.from(fileModules) : [];

        // Combine with modules provided by hotUpdate context
        const combinedModules = new Set([...modules, ...allModules]);
        const affectedModules = this.getAffectedModules(Array.from(combinedModules));

        // Invalidate the changed file and all affected modules
        const filesToInvalidate = new Set([file, ...affectedModules]);

        for (const fileToInvalidate of filesToInvalidate) {
            const mods = moduleGraph.getModulesByFile(fileToInvalidate);
            if (mods) {
                for (const mod of mods) {
                    moduleGraph.invalidateModule(mod);
                }
            }
        }

        // Emit invalidate event to runtime
        this.emit('invalidate', file);

        const payload: HmrUpdateEvent = { file, type, affectedModules };

        // Send custom event to the client/runner
        const hot = server.environments.ssr.hot;
        hot.send(HMR_EVENT_NAME, payload);

        // Return empty array to prevent default HMR update
        return [];
    }

    private isCriticalFile(file: string): boolean {
        const root = this.config.root;
        const relPath = relative(root, file);

        // Check user configured restart patterns
        if (this.config.hmr?.restart) {
            for (const pattern of this.config.hmr.restart) {
                if (minimatch(relPath, pattern)) {
                    return true;
                }
            }
        }

        // Check dynamic restart patterns
        for (const pattern of this.dynamicRestartPatterns) {
            if (minimatch(relPath, pattern)) {
                return true;
            }
        }

        // Config files
        if (
            file === this.config.configFile ||
            file.endsWith('package.json') ||
            file.endsWith('tsconfig.json') ||
            file.endsWith('.env')
        ) {
            return true;
        }

        // Entry points
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
