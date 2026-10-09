import type { SeedcordConfig } from '#core/config/schema';

export {
    SEEDCORD_CONFIG_FILENAMES,
    type SeedcordBuildConfig,
    type SeedcordConfig,
    type SeedcordHmrConfig
} from '#core/config/schema';

export { version } from '#core/version';

/**
 * Types the `seedcord.config.ts` of a bot that runs on Cloudflare Workers.
 */
export function defineConfig(config: SeedcordConfig): SeedcordConfig {
    return config;
}
