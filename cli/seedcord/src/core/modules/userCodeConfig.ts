// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- the one typed caller of mergeConfig
import { mergeConfig } from 'vite';

import { BOT_ENVIRONMENT } from './botEnvironment';
import { seedcordDependents } from './seedcordDependents';

import type { InlineConfig, UserConfig } from 'vite';

interface ResolveConditions {
    conditions: string[];
    externalConditions: string[];
}

export const NODE_CONDITIONS: ResolveConditions = { conditions: ['node', 'import'], externalConditions: ['node'] };

// @cloudflare/vite-plugin resolves a worker's imports with these
const WORKERD = ['workerd', 'worker', 'module', 'browser'];
export const WORKERD_CONDITIONS: ResolveConditions = { conditions: WORKERD, externalConditions: WORKERD };

export function mergeViteConfig(base: InlineConfig, overrides: InlineConfig): InlineConfig {
    // justified: vite types mergeConfig's result as Record<string, any>
    return mergeConfig(base, overrides) as InlineConfig;
}

export function userCodeBase(): UserConfig {
    return { resolve: { tsconfigPaths: true }, appType: 'custom' };
}

export function userCodeConfig(resolve: ResolveConditions, configDir: string): InlineConfig {
    return mergeViteConfig(userCodeBase(), {
        environments: {
            [BOT_ENVIRONMENT]: {
                resolve: {
                    ...resolve,
                    // the dev TUI and the step printer read the bot's logs from the CLI's own logger registry
                    external: ['@seedcord/logger', '@seedcord/logger/node'],
                    noExternal: [
                        // node throws on the decorators in the project files these import.
                        // HmrManager.init also reads import.meta.hot. vite adds it only to modules it transforms
                        /^@seedcord\//,
                        // node would load these plugin packages with their own copy of @seedcord/core
                        ...seedcordDependents(configDir)
                    ]
                }
            }
        }
    });
}
