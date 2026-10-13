import { realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';

import { mergeViteConfig, NODE_CONDITIONS, userCodeConfig } from '#core/modules/userCodeConfig';
import { STATE_FOLDER } from '#core/state/StateFolder';

// a **/logs/** glob would also swallow a source directory named logs
// WinstonFileSink writes logs/ under the cwd
export function logsIgnore(cwd: string): (path: string) => boolean {
    // chokidar reports the resolved path, and a mac temp dir arrives through a symlink
    const logs = resolve(realpathSync(cwd), 'logs');

    return (path) => path === logs || path.startsWith(logs + sep);
}

export const devServerConfig = mergeViteConfig(userCodeConfig(NODE_CONDITIONS), {
    server: {
        middlewareMode: true,
        hmr: true,
        watch: {
            usePolling: false,
            ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**', `**/${STATE_FOLDER}/**`]
        }
    },
    build: {
        ssr: true,
        outDir: 'dist',
        sourcemap: true,
        minify: false,
        rollupOptions: {
            output: {
                format: 'esm',
                preserveModules: true
            }
        }
    },
    future: {
        removeSsrLoadModule: 'warn',
        removePluginHookHandleHotUpdate: 'warn',
        removePluginHookSsrArgument: 'warn',
        removeServerModuleGraph: 'warn',
        removeServerReloadModule: 'warn',
        removeServerPluginContainer: 'warn',
        removeServerHot: 'warn',
        removeServerTransformRequest: 'warn',
        removeServerWarmupRequest: 'warn'
    },
    clearScreen: false,
    logLevel: 'error'
});
