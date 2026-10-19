import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- the one typed caller of mergeConfig
import { mergeConfig } from 'vite';

import { seedcordDependents } from './seedcordDependents';

import type { InlineConfig, UserConfig } from 'vite';

interface ResolveConditions {
    conditions: string[];
    externalConditions: string[];
}

// renaming this breaks user plugins that check for 'seedcord'
export const BOT_ENVIRONMENT = 'seedcord';
// edge dev's node copy of the bot, beside a worker in BOT_ENVIRONMENT
export const CODEGEN_ENVIRONMENT = 'codegen';

export type BotEnvironmentName = typeof BOT_ENVIRONMENT | typeof CODEGEN_ENVIRONMENT;

export const NODE_CONDITIONS: ResolveConditions = { conditions: ['node', 'import'], externalConditions: ['node'] };

// @cloudflare/vite-plugin resolves a worker's imports with these
const WORKERD = ['workerd', 'worker', 'module', 'browser'];
export const WORKERD_CONDITIONS: ResolveConditions = { conditions: WORKERD, externalConditions: WORKERD };

export function mergeViteConfig(base: InlineConfig, overrides: InlineConfig): InlineConfig {
    // justified: vite types mergeConfig's result as Record<string, any>
    return mergeConfig(base, overrides) as InlineConfig;
}

const SEEDCORD_DECLARES_IT = `seedcord adds it to the Vite config. Look in ${paint.bold('vitePlugins')} for a plugin whose ${paint.bold('config')} hook rewrites ${paint.bold('environments')}.`;

export function environmentNamed<Environment>(
    environments: Record<string, Environment>,
    name: BotEnvironmentName,
    fix = SEEDCORD_DECLARES_IT
): Environment {
    const environment = environments[name];
    if (environment) return environment;
    throw new SeedcordError(SeedcordErrorCode.CliViteEnvironmentMissing, [name, Object.keys(environments), fix]);
}

export function userCodeConfig(
    environment: BotEnvironmentName,
    resolve: ResolveConditions,
    configDir: string
): UserConfig {
    return {
        resolve: { tsconfigPaths: true },
        environments: {
            [environment]: {
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
        },
        appType: 'custom'
    };
}
