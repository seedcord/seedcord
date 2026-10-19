import { dirname, resolve } from 'node:path';

import { isInside, moduleGlobs, posixRelative } from '@seedcord/utils/node/internal';

import {
    BOT_ENVIRONMENT,
    mergeViteConfig,
    NODE_CONDITIONS,
    userCodeConfig,
    WORKERD_CONDITIONS
} from '#core/modules/userCodeConfig';
import { watchedPath } from '#core/project/watchedPath';
import { STATE_FOLDER } from '#core/state/StateFolder';

import { workerLogger } from './workerLogger';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { InlineConfig } from 'vite';

type DevConfigPaths = Pick<ResolvedSeedcordConfig, 'root' | 'configFile'>;

// edge dev's node copy of the bot, since the worker uses BOT_ENVIRONMENT in the same server
export const CODEGEN_ENVIRONMENT = 'codegen';

// a **/logs/** glob would also swallow a source directory named logs
// WinstonFileSink writes logs/ under the cwd
function logsIgnore(cwd: string): (path: string) => boolean {
    const logs = resolve(watchedPath(cwd), 'logs');

    return (path) => isInside(logs, path);
}

// vite writes resolved options back into the config object it receives
function devViteConfig(
    environment: string,
    conditions: Parameters<typeof userCodeConfig>[1],
    config: DevConfigPaths,
    cwd: string
): InlineConfig {
    return mergeViteConfig(userCodeConfig(environment, conditions, dirname(config.configFile)), {
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
        }
    });
}

export function serverViteConfig(config: DevConfigPaths, cwd: string): InlineConfig {
    return mergeViteConfig(devViteConfig(BOT_ENVIRONMENT, NODE_CONDITIONS, config, cwd), {
        root: dirname(config.configFile),
        logLevel: 'error'
    });
}

export function edgeViteConfig(config: DevConfigPaths, viteRoot: string, cwd: string): InlineConfig {
    return mergeViteConfig(devViteConfig(CODEGEN_ENVIRONMENT, WORKERD_CONDITIONS, config, cwd), {
        root: viteRoot,
        customLogger: workerLogger(),
        // discord's POST arrives under the tunnel's hostname. the endpoint blocks every other request
        server: { allowedHosts: true },
        // the plugin's dep scan finds nothing in a virtual main. vite then reloads mid-start and leaves a second envapt with no source bound
        environments: {
            [BOT_ENVIRONMENT]: {
                // a glob reads a windows separator as an escape
                optimizeDeps: { entries: moduleGlobs(posixRelative(viteRoot, config.root) || '.') }
            }
        }
    });
}
