import { realpathSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';

import { seedcordDependents } from '#core/modules/seedcordDependents';
import { mergeViteConfig, NODE_CONDITIONS, userCodeConfig } from '#core/modules/userCodeConfig';
import { STATE_FOLDER } from '#core/state/StateFolder';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { InlineConfig } from 'vite';

// a **/logs/** glob would also swallow a source directory named logs
// WinstonFileSink writes logs/ under the cwd
function logsIgnore(cwd: string): (path: string) => boolean {
    // chokidar reports the resolved path, and a mac temp dir arrives through a symlink
    const logs = resolve(realpathSync(cwd), 'logs');

    return (path) => path === logs || path.startsWith(logs + sep);
}

export function devWatchIgnores(cwd: string): (string | ((path: string) => boolean))[] {
    return ['**/node_modules/**', '**/dist/**', '**/.git/**', `**/${STATE_FOLDER}/**`, logsIgnore(cwd)];
}

// vite writes resolved options back into the config object it receives
export function serverViteConfig(
    config: Pick<ResolvedSeedcordConfig, 'root' | 'configFile'>,
    cwd: string
): InlineConfig {
    return mergeViteConfig(userCodeConfig(NODE_CONDITIONS), {
        root: config.root,
        // vite searches its own root for a config file
        configFile: false,
        server: { middlewareMode: true, watch: { ignored: devWatchIgnores(cwd) } },
        clearScreen: false,
        logLevel: 'error',
        // an external plugin would load node's copy of @seedcord/core beside vite's
        ssr: { noExternal: seedcordDependents(dirname(config.configFile)) }
    });
}
