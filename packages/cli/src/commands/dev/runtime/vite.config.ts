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
        external: ['@seedcord/services'],
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
        removePluginHookHandleHotUpdate: 'warn'
    },
    clearScreen: false,
    logLevel: 'error',
    appType: 'custom'
});
