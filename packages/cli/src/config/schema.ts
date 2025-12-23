/**
 * Configuration used by the Seedcord CLI when running `seedcord dev`.
 */
export interface SeedcordDevConfig {
    /**
     * Root directory used for resolving relative paths. Defaults to the config directory.
     */
    root?: string;
    /**
     * Path to the module whose default export is a configured Seedcord instance.
     */
    instance: string;
}

/**
 * Fully resolved configuration with absolute file system paths.
 */
export interface ResolvedSeedcordDevConfig extends Required<SeedcordDevConfig> {
    /**
     * Absolute path to the config file that produced this resolution.
     */
    configFile: string;
}

/**
 * Supported configuration filenames discovered by the CLI.
 */
export const SEEDCORD_CONFIG_FILENAMES = ['seedcord.config.ts', 'seedcord.config.mts'] as const;

/**
 * Helper so config files receive proper type inference.
 */
export function defineConfig(config: SeedcordDevConfig): SeedcordDevConfig {
    return config;
}
