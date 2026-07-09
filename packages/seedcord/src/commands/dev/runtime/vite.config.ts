import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        middlewareMode: true,
        hmr: true,
        watch: {
            usePolling: false,
            ignored: ['**/node_modules/**', '**/dist/**']
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
    ssr: {
        target: 'node',
        // externalize the logger so the bot shares the CLI's LoggerChannelRegistry singleton, the dev
        // TUI captures through it
        external: ['@seedcord/logger', '@seedcord/logger/node', '@seedcord/services'],
        resolve: {
            conditions: ['node', 'import'],
            externalConditions: ['node']
        }
    },
    environments: {
        ssr: {
            resolve: {
                conditions: ['node', 'import'],
                externalConditions: ['node']
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
    logLevel: 'error',
    appType: 'custom'
});
