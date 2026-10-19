import { dirname, join, relative, resolve } from 'node:path';

import { isInside, posixRelative, toPosixPath } from '@seedcord/utils/internal';
import { minimatch } from 'minimatch';

import { BOT_ENVIRONMENT } from '#core/modules/botEnvironment';
import { mergeViteConfig, NODE_CONDITIONS, userCodeBase, userCodeConfig } from '#core/modules/userCodeConfig';
import { watchedPath } from '#core/project/watchedPath';
import { STATE_FOLDER } from '#core/state/StateFolder';

import { workerLogger } from './workerLogger';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { BotLayout } from '@seedcord/utils/internal';
import type { InlineConfig, ServerOptions, UserConfig } from 'vite';

type DevConfigPaths = Pick<ResolvedSeedcordConfig, 'root' | 'configFile'>;

// a linked workspace package lives outside root
const OUTSIDE_ROOT_IGNORES = ['**/node_modules/**', '**/dist/**', '**/.git/**', `**/${STATE_FOLDER}/**`];

export function devWatchOptions(layout: BotLayout, cwd: string): NonNullable<ServerOptions['watch']> {
    // WinstonFileSink writes logs/ under the cwd
    const logs = resolve(watchedPath(cwd), 'logs');
    const realRoot = watchedPath(layout.root);
    const ignored = (path: string): boolean => {
        if (isInside(realRoot, path)) {
            const file = join(layout.root, relative(realRoot, path));
            // vite restarts itself when tsconfig.json or package.json changes
            return layout.isSkipped(file) && !layout.isProjectFile(file);
        }
        const posix = toPosixPath(path);
        return isInside(logs, path) || OUTSIDE_ROOT_IGNORES.some((pattern) => minimatch(posix, pattern, { dot: true }));
    };
    return { ignored };
}

// vite writes resolved options back into the config object it receives
function devViteConfig(base: UserConfig, layout: BotLayout, cwd: string): InlineConfig {
    return mergeViteConfig(base, {
        // vite searches its own root for a config file
        configFile: false,
        clearScreen: false,
        server: {
            middlewareMode: true,
            // no browser connects to vite's hmr socket on port 24678
            ws: false,
            watch: devWatchOptions(layout, cwd)
        }
    });
}

export function serverViteConfig(config: DevConfigPaths, layout: BotLayout, cwd: string): InlineConfig {
    const configDir = dirname(config.configFile);
    return mergeViteConfig(devViteConfig(userCodeConfig(NODE_CONDITIONS, configDir), layout, cwd), {
        root: configDir,
        logLevel: 'error'
    });
}

export function edgeViteConfig(config: DevConfigPaths, layout: BotLayout, viteRoot: string, cwd: string): InlineConfig {
    return mergeViteConfig(devViteConfig(userCodeBase(), layout, cwd), {
        root: viteRoot,
        customLogger: workerLogger(),
        // discord's POST arrives under the tunnel's hostname. the endpoint blocks every other request
        server: { allowedHosts: true },
        // the plugin's dep scan finds nothing in a virtual main. vite then reloads mid-start and leaves a second envapt with no source bound
        environments: {
            [BOT_ENVIRONMENT]: {
                // a glob reads a windows separator as an escape
                optimizeDeps: { entries: layout.moduleGlobs(posixRelative(viteRoot, config.root) || '.') }
            }
        }
    });
}
