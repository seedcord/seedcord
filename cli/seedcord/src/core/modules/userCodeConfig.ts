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
            // the dev TUI and the step printer read the bot's logs from the CLI's own logger registry
            external: ['@seedcord/logger', '@seedcord/logger/node'],
            // node can't parse the decorators in project files these import.
            // HmrManager.init reads import.meta.hot, set only on modules transformed by vite.
            noExternal: [/^@seedcord\//],
            resolve
        },
        environments: { ssr: { resolve } },
        appType: 'custom'
    };
}
