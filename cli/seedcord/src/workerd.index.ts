import type { SeedcordConfig } from '#core/config/schema';

export {
    SEEDCORD_CONFIG_FILENAMES,
    type SeedcordBuildConfig,
    type SeedcordConfig,
    type SeedcordHmrConfig
} from '#core/config/schema';

export { version } from '#core/version';

/**
 * Helper so an edge bot's config file receives proper type inference.
 */
export function defineConfig(config: SeedcordConfig): SeedcordConfig {
    return config;
}
