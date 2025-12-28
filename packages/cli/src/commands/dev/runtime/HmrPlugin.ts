import { relative } from 'node:path';

import { Logger } from '@seedcord/services';
import chalk from 'chalk';

import type { HmrContext, Plugin } from 'vite';

export class HmrPlugin {
    private readonly logger: Logger;
    private lastUpdate: { file: string; time: number } | null = null;

    constructor() {
        this.logger = new Logger('HMR', { channel: 'hmr' });
    }

    public get plugin(): Plugin {
        return {
            name: 'seedcord:hmr',
            handleHotUpdate: this.hotUpdate.bind(this)
        };
    }

    private hotUpdate(ctx: HmrContext): void {
        const { file } = ctx;
        const now = Date.now();

        // Debounce rapid updates to the same file
        if (this.lastUpdate?.file === file && now - this.lastUpdate.time < 100) {
            return;
        }
        this.lastUpdate = { file, time: now };

        const relPath = relative(process.cwd(), file);
        const type = 'update';
        const typeColor = chalk.blue;

        this.logger.info(`${typeColor(type.toUpperCase())} ${chalk.gray(relPath)}`);
    }
}
