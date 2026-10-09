import type { UserConfig } from 'vite';

interface ResolveConditions {
    conditions: string[];
    externalConditions: string[];
}

export const NODE_CONDITIONS: ResolveConditions = { conditions: ['node', 'import'], externalConditions: ['node'] };

// @cloudflare/vite-plugin resolves a worker's imports with these
const WORKERD = ['workerd', 'worker', 'module', 'browser'];
export const WORKERD_CONDITIONS: ResolveConditions = { conditions: WORKERD, externalConditions: WORKERD };

export function userCodeConfig(resolve: ResolveConditions): UserConfig {
    return {
        resolve: { tsconfigPaths: true },
        ssr: {
            target: 'node',
            // logger stays external so the bot shares the CLI's LoggerChannelRegistry singleton the dev TUI reads through
            external: ['@seedcord/logger', '@seedcord/logger/node'],
            // node's loader can't parse the decorators in a project .ts file that an external package imports.
            // HmrManager.init reads import.meta.hot. vite injects it only into modules it transforms.
            noExternal: [/^@seedcord\//],
            resolve: { ...resolve }
        },
        environments: { ssr: { resolve: { ...resolve } } },
        appType: 'custom'
    };
}
