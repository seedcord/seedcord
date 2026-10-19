import { watch } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';

import { viteEnvFiles } from '#core/modules/viteEnvFiles';
import { realPath } from '#core/project/realPath';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { RealPath } from '#core/project/realPath';
import type { FSWatcher } from 'node:fs';

const logger = new Logger('HMR', { channel: 'hmr' });

export class ViteRestartFiles {
    private readonly names: Set<string>;

    constructor(
        private readonly dir: RealPath,
        names: readonly string[]
    ) {
        this.names = new Set(names);
    }

    public static forConfig(
        { configFile, viteMode }: Pick<ResolvedSeedcordConfig, 'configFile' | 'viteMode'>,
        targetFiles: readonly string[]
    ): ViteRestartFiles {
        return new ViteRestartFiles(realPath(dirname(configFile)), [
            basename(configFile),
            ...viteEnvFiles(viteMode),
            ...targetFiles
        ]);
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
