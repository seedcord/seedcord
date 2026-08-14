import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        middlewareMode: true,
        hmr: true,
        watch: {
            usePolling: false,
            // the bot's own log file lands under logs/, and every line it writes would echo back as an update
            ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/logs/**']
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
        // logger stays external so the bot shares the CLI's LoggerChannelRegistry singleton the dev TUI reads through
        external: ['@seedcord/logger', '@seedcord/logger/node'],
        // an externalized package's import() of a project .ts file goes to node's loader, which cannot parse decorators
        // vite injects import.meta.hot only into modules it transforms, and HmrManager.init reads it
        noExternal: [/^@seedcord\//],
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
