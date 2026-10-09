import { realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';

import { mergeConfig } from 'vite';

import { NODE_CONDITIONS, userCodeConfig } from '#core/modules/userCodeConfig';

// a **/logs/** glob would also swallow a source directory named logs
export function logsIgnore(root: string): (path: string) => boolean {
    // chokidar reports the resolved path, and a mac temp dir arrives through a symlink
    const logs = resolve(realpathSync(root), 'logs');

    return (path) => path === logs || path.startsWith(logs + sep);
}

export const devServerConfig = mergeConfig(userCodeConfig(NODE_CONDITIONS), {
    server: {
        middlewareMode: true,
        hmr: true,
        watch: {
            usePolling: false,
            ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**']
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
