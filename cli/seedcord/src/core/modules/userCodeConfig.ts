import { defineConfig } from 'vite';

export const userCodeConfig = defineConfig({
    resolve: { tsconfigPaths: true },
    ssr: {
        target: 'node',
        // logger stays external so the bot shares the CLI's LoggerChannelRegistry singleton the dev TUI reads through
        external: ['@seedcord/logger', '@seedcord/logger/node'],
        // node's loader can't parse the decorators in a project .ts file that an external package imports.
        // HmrManager.init reads import.meta.hot. vite injects it only into modules it transforms.
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
    appType: 'custom'
});
