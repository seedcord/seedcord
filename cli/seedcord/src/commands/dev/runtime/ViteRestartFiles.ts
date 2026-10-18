import { watch } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';

import { watchedPath } from '#core/project/watchedPath';

import type { FSWatcher } from 'node:fs';

const logger = new Logger('HMR', { channel: 'hmr' });

export class ViteRestartFiles {
    private readonly dir: string;
    private readonly names: Set<string>;

    constructor(dir: string, names: readonly string[]) {
        this.dir = watchedPath(dir);
        this.names = new Set(names);
    }

    // chokidar passes forward slashes to vite's ignored matchers on windows
    public readonly includes = (path: string): boolean => {
        const file = resolve(path);
        return dirname(file) === this.dir && this.names.has(basename(file));
    };

    // fs.watch on a file stops once an atomic save replaces it
    public watch(onChange: (file: string) => void): FSWatcher {
        const watcher = watch(this.dir, (_event, name) => {
            const file = name === null ? undefined : join(this.dir, name);
            if (file !== undefined && this.includes(file)) onChange(file);
        });
        // node throws process-wide without a listener here
        watcher.on('error', (error) => {
            logger.warn(`Stopped watching ${paint.path(this.dir)} for changes that need a restart: ${error.message}`);
        });
        return watcher;
    }
}
