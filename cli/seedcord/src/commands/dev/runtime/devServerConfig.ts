import { dirname } from 'node:path';

import { isInside, posixRelative, toPosixPath } from '@seedcord/utils/internal';
import { minimatch } from 'minimatch';

import { BOT_ENVIRONMENT } from '#core/modules/botEnvironment';
import { mergeViteConfig, NODE_CONDITIONS, userCodeBase, userCodeConfig } from '#core/modules/userCodeConfig';
import { STATE_FOLDER } from '#core/state/StateFolder';

import { workerLogger } from './workerLogger';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { BotLayout } from '@seedcord/utils/internal';
import type { Server } from 'node:http';
import type { InlineConfig, ServerOptions, UserConfig } from 'vite';

// a linked workspace package lives outside root
const OUTSIDE_ROOT_IGNORES = ['node_modules', 'dist', '.git', STATE_FOLDER].map((folder) => `**/${folder}{,/**}`);

export function devWatchOptions(layout: BotLayout, clientDir: string): NonNullable<ServerOptions['watch']> {
    const ignored = (file: string): boolean => {
        // HmrPlugin triggers a restart when one changes
        if (layout.isProjectFile(file)) return false;
        // the bot never loads the pages folder, but vite has to see each save there to update the open pages
        if (isInside(clientDir, file)) return false;
        if (layout.isSkipped(file)) return true;
        const posix = toPosixPath(file);
        return !layout.holds(file) && OUTSIDE_ROOT_IGNORES.some((pattern) => minimatch(posix, pattern, { dot: true }));
    };
    return { ignored };
}

// vite writes resolved options back into the config object it receives
function devViteConfig(base: UserConfig, layout: BotLayout, clientDir: string, sockets: Server): InlineConfig {
    return mergeViteConfig(base, {
        // vite searches its own root for a config file
        configFile: false,
        clearScreen: false,
        server: {
            middlewareMode: true,
            // the server in front of vite hands it each socket that its browser client opens
            ws: { server: sockets },
            // requests arrive under the tunnel's hostname, and vite blocks unlisted hosts
            allowedHosts: true,
            watch: devWatchOptions(layout, clientDir)
        }
    });
}

export function serverViteConfig(
    { configFile, client }: Pick<ResolvedSeedcordConfig, 'configFile' | 'client'>,
    layout: BotLayout,
    sockets: Server
): InlineConfig {
    const configDir = dirname(configFile);
    return mergeViteConfig(devViteConfig(userCodeConfig(NODE_CONDITIONS, configDir), layout, client.dir, sockets), {
        root: configDir,
        logLevel: 'error'
    });
}

export function edgeViteConfig(layout: BotLayout, viteRoot: string, clientDir: string, sockets: Server): InlineConfig {
    return mergeViteConfig(devViteConfig(userCodeBase(), layout, clientDir, sockets), {
        root: viteRoot,
        customLogger: workerLogger(),
        // the plugin's dep scan comes up empty in a virtual main. vite then reloads mid-start and leaves a second envapt without a source bound
        environments: {
            [BOT_ENVIRONMENT]: {
                // a glob reads a windows separator as an escape
                optimizeDeps: { entries: layout.moduleGlobs(posixRelative(viteRoot, layout.root) || '.') }
            }
        }
    });
}
