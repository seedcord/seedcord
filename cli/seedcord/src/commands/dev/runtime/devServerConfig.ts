import { dirname } from 'node:path';

import { posixRelative, toPosixPath } from '@seedcord/utils/internal';
import { minimatch } from 'minimatch';

import { BOT_ENVIRONMENT } from '#core/modules/botEnvironment';
import { mergeViteConfig, NODE_CONDITIONS, userCodeBase, userCodeConfig } from '#core/modules/userCodeConfig';
import { STATE_FOLDER } from '#core/state/StateFolder';

import { workerLogger } from './workerLogger';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { BotLayout } from '@seedcord/utils/internal';
import type { InlineConfig, ServerOptions, UserConfig } from 'vite';

// a linked workspace package lives outside root
const OUTSIDE_ROOT_IGNORES = ['node_modules', 'dist', '.git', STATE_FOLDER].map((folder) => `**/${folder}{,/**}`);

export function devWatchOptions(layout: BotLayout): NonNullable<ServerOptions['watch']> {
    const ignored = (file: string): boolean => {
        // HmrPlugin asks for a restart when one changes
        if (layout.isProjectFile(file)) return false;
        if (layout.isSkipped(file)) return true;
        const posix = toPosixPath(file);
        return !layout.holds(file) && OUTSIDE_ROOT_IGNORES.some((pattern) => minimatch(posix, pattern, { dot: true }));
    };
    return { ignored };
}

// vite writes resolved options back into the config object it receives
function devViteConfig(base: UserConfig, layout: BotLayout): InlineConfig {
    return mergeViteConfig(base, {
        // vite searches its own root for a config file
        configFile: false,
        clearScreen: false,
        server: {
            middlewareMode: true,
            // no browser connects to vite's hmr socket on port 24678
            ws: false,
            watch: devWatchOptions(layout)
        }
    });
}

export function serverViteConfig(
    { configFile }: Pick<ResolvedSeedcordConfig, 'configFile'>,
    layout: BotLayout
): InlineConfig {
    const configDir = dirname(configFile);
    return mergeViteConfig(devViteConfig(userCodeConfig(NODE_CONDITIONS, configDir), layout), {
        root: configDir,
        logLevel: 'error'
    });
}

export function edgeViteConfig(layout: BotLayout, viteRoot: string): InlineConfig {
    return mergeViteConfig(devViteConfig(userCodeBase(), layout), {
        root: viteRoot,
        customLogger: workerLogger(),
        // discord's POST arrives under the tunnel's hostname. the endpoint blocks every other request
        server: { allowedHosts: true },
        // the plugin's dep scan finds nothing in a virtual main. vite then reloads mid-start and leaves a second envapt with no source bound
        environments: {
            [BOT_ENVIRONMENT]: {
                // a glob reads a windows separator as an escape
                optimizeDeps: { entries: layout.moduleGlobs(posixRelative(viteRoot, layout.root) || '.') }
            }
        }
    });
}
