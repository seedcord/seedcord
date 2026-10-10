import type { SeedcordConfig } from '#core/config/schema';

export type { SeedcordBuildConfig, SeedcordConfig, SeedcordHmrConfig } from '#core/config/schema';

/**
 * Types the `seedcord.config.ts` of a bot that runs on Cloudflare Workers.
 */
export function defineConfig(config: SeedcordConfig): SeedcordConfig {
    return config;
}
