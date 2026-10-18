import { dirname, resolve } from 'node:path';

import { isInside, moduleGlobs, posixRelative } from '@seedcord/utils/node/internal';

import { WORKER_ENVIRONMENT } from '#core/modules/cloudflarePlugin';
import { seedcordDependents } from '#core/modules/seedcordDependents';
import { mergeViteConfig, NODE_CONDITIONS, userCodeConfig, WORKERD_CONDITIONS } from '#core/modules/userCodeConfig';
import { watchedPath } from '#core/project/watchedPath';
import { STATE_FOLDER } from '#core/state/StateFolder';

import { workerLogger } from './workerLogger';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { InlineConfig } from 'vite';

type DevConfigPaths = Pick<ResolvedSeedcordConfig, 'root' | 'configFile'>;

// a **/logs/** glob would also swallow a source directory named logs
// WinstonFileSink writes logs/ under the cwd
function logsIgnore(cwd: string): (path: string) => boolean {
    const logs = resolve(watchedPath(cwd), 'logs');

    return (path) => isInside(logs, path);
}

// vite writes resolved options back into the config object it receives
function devViteConfig(
    conditions: Parameters<typeof userCodeConfig>[0],
    config: DevConfigPaths,
    cwd: string
): InlineConfig {
    return mergeViteConfig(userCodeConfig(conditions), {
        // vite searches its own root for a config file
        configFile: false,
        clearScreen: false,
        server: {
            middlewareMode: true,
            // no browser connects to vite's hmr socket on port 24678
            ws: false,
            watch: {
                ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**', `**/${STATE_FOLDER}/**`, logsIgnore(cwd)]
            }
        },
        // an external plugin would load node's copy of @seedcord/core beside vite's
        ssr: { noExternal: seedcordDependents(dirname(config.configFile)) }
    });
}

export function serverViteConfig(config: DevConfigPaths, cwd: string): InlineConfig {
    return mergeViteConfig(devViteConfig(NODE_CONDITIONS, config, cwd), { root: config.root, logLevel: 'error' });
}

export function edgeViteConfig(config: DevConfigPaths, viteRoot: string, cwd: string): InlineConfig {
    return mergeViteConfig(devViteConfig(WORKERD_CONDITIONS, config, cwd), {
        root: viteRoot,
        customLogger: workerLogger(),
        // discord's POST arrives under the tunnel's hostname. the endpoint blocks every other request
        server: { allowedHosts: true },
        // the plugin's dep scan finds nothing in a virtual main. vite then reloads mid-start and leaves a second envapt with no source bound
        environments: {
            [WORKER_ENVIRONMENT]: {
                // a glob reads a windows separator as an escape
                optimizeDeps: { entries: moduleGlobs(posixRelative(viteRoot, config.root) || '.') }
            }
        }
    });
}
