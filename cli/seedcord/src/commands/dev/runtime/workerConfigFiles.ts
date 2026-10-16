import { realpathSync, watch } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';

import type { FSWatcher } from 'node:fs';

const logger = new Logger('HMR', { channel: 'hmr' });

export class WorkerConfigFiles {
    private readonly config: string;
    private readonly dir: string;
    private readonly localVars: Set<string>;

    constructor(cloudflareConfig: string, mode: string) {
        // chokidar reports a mac temp dir by its resolved path
        this.config = realpathSync(cloudflareConfig);
        this.dir = dirname(this.config);
        // the cloudflare plugin reads all six
        this.localVars = new Set([
            '.dev.vars',
            `.dev.vars.${mode}`,
            '.env',
            '.env.local',
            `.env.${mode}`,
            `.env.${mode}.local`
        ]);
    }

    public readonly includes = (path: string): boolean =>
        path === this.config || (dirname(path) === this.dir && this.localVars.has(basename(path)));

    // fs.watch on a file stops once an atomic save replaces it
    public watch(onChange: (file: string) => void): FSWatcher {
        const watcher = watch(this.dir, (_event, name) => {
            const file = name === null ? undefined : join(this.dir, name);
            if (file !== undefined && this.includes(file)) onChange(file);
        });
        // node throws process-wide without a listener here
        watcher.on('error', (error) => {
            logger.warn(
                `Stopped watching ${paint.path(this.dir)} for changes to cloudflare.config.ts and the env files: ${error.message}`
            );
        });
        return watcher;
    }
}
