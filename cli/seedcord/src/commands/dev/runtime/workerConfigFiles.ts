import { realpathSync, watch } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';

import type { FSWatcher } from 'node:fs';

const logger = new Logger('HMR', { channel: 'hmr' });

// the cloudflare plugin restarts vite itself when its watcher reports one of these
const LOCAL_VARS = ['.dev.vars', '.env'];

// covers the per-environment copies too, like .dev.vars.staging
function isLocalVars(name: string): boolean {
    return LOCAL_VARS.some((vars) => name === vars || name.startsWith(`${vars}.`));
}

export function isWorkerConfigFile(wranglerConfig: string): (path: string) => boolean {
    // chokidar reports a mac temp dir by its resolved path
    const config = realpathSync(wranglerConfig);
    const dir = dirname(config);
    return (path) => path === config || (dirname(path) === dir && isLocalVars(basename(path)));
}

// fs.watch on a file stops once an atomic save replaces it
export function watchWorkerConfig(wranglerConfig: string, onChange: (file: string) => void): FSWatcher {
    const isConfig = isWorkerConfigFile(wranglerConfig);
    const dir = dirname(realpathSync(wranglerConfig));
    const watcher = watch(dir, (_event, name) => {
        const file = name === null ? undefined : join(dir, name);
        if (file !== undefined && isConfig(file)) onChange(file);
    });
    // node throws process-wide without a listener here
    watcher.on('error', (error) => {
        logger.warn(`Stopped watching ${paint.path(dir)} for wrangler config changes: ${error.message}`);
    });
    return watcher;
}
