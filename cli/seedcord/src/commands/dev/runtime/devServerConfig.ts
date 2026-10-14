import { realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';

import { mergeViteConfig, NODE_CONDITIONS, userCodeConfig } from '#core/modules/userCodeConfig';
import { STATE_FOLDER } from '#core/state/StateFolder';

import type { InlineConfig } from 'vite';

// a **/logs/** glob would also swallow a source directory named logs
// WinstonFileSink writes logs/ under the cwd
export function logsIgnore(cwd: string): (path: string) => boolean {
    // chokidar reports the resolved path, and a mac temp dir arrives through a symlink
    const logs = resolve(realpathSync(cwd), 'logs');

    return (path) => path === logs || path.startsWith(logs + sep);
}

// vite writes resolved options back into the config object it receives
export function devServerConfig(): InlineConfig {
    return mergeViteConfig(userCodeConfig(NODE_CONDITIONS), {
        server: {
            middlewareMode: true,
            watch: { ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**', `**/${STATE_FOLDER}/**`] }
        },
        clearScreen: false,
        logLevel: 'error'
    });
}
