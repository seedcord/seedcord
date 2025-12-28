import { relative } from 'node:path';

import { Logger } from '@seedcord/services';
import chalk from 'chalk';

import { HMR_EVENT_NAME } from '@api/Hmr';

import type { HmrEventType, HmrUpdateEvent } from '@api/Hmr';
import type { HmrContext, ModuleNode, Plugin, ViteDevServer } from 'vite';

const DEBOUNCE_MS = 250;

export class HmrPlugin {
    private readonly logger: Logger;
    private lastUpdate: { file: string; time: number } | null = null;

    constructor() {
        this.logger = new Logger('HMR', { channel: 'hmr' });
    }

    public get plugin(): Plugin {
        return {
            name: 'seedcord:hmr',
            configureServer: this.configureServer.bind(this),
            handleHotUpdate: this.hotUpdate.bind(this)
        };
    }

    private configureServer(server: ViteDevServer): void {
        server.watcher.on('add', (file) => this.handleFileEvent(server, file, 'create'));
        server.watcher.on('unlink', (file) => this.handleFileEvent(server, file, 'delete'));
        server.watcher.on('addDir', (file) => this.handleFileEvent(server, file, 'createDir'));
        server.watcher.on('unlinkDir', (file) => this.handleFileEvent(server, file, 'deleteDir'));
    }

    private handleFileEvent(server: ViteDevServer, file: string, type: HmrEventType): void {
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

    private hotUpdate(ctx: HmrContext): void {
        const { file, server, modules } = ctx;
        const now = Date.now();

        // Debounce rapid updates to the same file
        if (this.lastUpdate?.file === file && now - this.lastUpdate.time < DEBOUNCE_MS) {
            return;
        }
        this.lastUpdate = { file, time: now };

        const relPath = relative(process.cwd(), file);
        const type = 'update';
        const typeColor = chalk.blue;

        this.logger.info(`${typeColor(type.toUpperCase())} ${chalk.gray(relPath)}`);

        const affectedModules = this.getAffectedModules(modules);
        const payload: HmrUpdateEvent = { file, type, affectedModules };

        // Send custom event to the client/runner
        // Try sending to ssr environment if available, otherwise default hot
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const hot = server.environments?.ssr?.hot ?? server.hot;
        hot.send(HMR_EVENT_NAME, payload);
    }

    private getAffectedModules(modules: ModuleNode[]): string[] {
        const affected = new Set<string>();
        const seen = new Set<string>();

        const traverse = (mod: ModuleNode): void => {
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
