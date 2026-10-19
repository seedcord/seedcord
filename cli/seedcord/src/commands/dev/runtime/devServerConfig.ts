import { dirname, resolve } from 'node:path';

import { isInside, moduleGlobs, posixRelative } from '@seedcord/utils/node/internal';

import { BOT_ENVIRONMENT, mergeViteConfig, NODE_CONDITIONS, userCodeConfig } from '#core/modules/userCodeConfig';
import { watchedPath } from '#core/project/watchedPath';
import { STATE_FOLDER } from '#core/state/StateFolder';

import { workerLogger } from './workerLogger';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { InlineConfig, ServerOptions, UserConfig } from 'vite';

type DevConfigPaths = Pick<ResolvedSeedcordConfig, 'root' | 'configFile'>;

// a **/logs/** glob would also swallow a source directory named logs
// WinstonFileSink writes logs/ under the cwd
function logsIgnore(cwd: string): (path: string) => boolean {
    const logs = resolve(watchedPath(cwd), 'logs');

    return (path) => isInside(logs, path);
}

export function devWatchOptions(cwd: string): NonNullable<ServerOptions['watch']> {
    return { ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**', `**/${STATE_FOLDER}/**`, logsIgnore(cwd)] };
}

// vite writes resolved options back into the config object it receives
function devViteConfig(base: UserConfig, cwd: string): InlineConfig {
    return mergeViteConfig(base, {
        // vite searches its own root for a config file
        configFile: false,
        clearScreen: false,
        server: {
            middlewareMode: true,
            // no browser connects to vite's hmr socket on port 24678
            ws: false,
            watch: devWatchOptions(cwd)
        }
    });
}

export function serverViteConfig(config: DevConfigPaths, cwd: string): InlineConfig {
    const configDir = dirname(config.configFile);
    return mergeViteConfig(devViteConfig(userCodeConfig(NODE_CONDITIONS, configDir), cwd), {
        root: configDir,
        logLevel: 'error'
    });
}

export function edgeViteConfig(config: DevConfigPaths, viteRoot: string, cwd: string): InlineConfig {
    return mergeViteConfig(devViteConfig({ resolve: { tsconfigPaths: true }, appType: 'custom' }, cwd), {
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
