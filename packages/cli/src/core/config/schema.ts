/**
 * Build configuration used by the Seedcord CLI.
 */
export interface SeedcordBuildConfig {
    /**
     * Directory where build artifacts should be emitted. Defaults to ./dist relative to the config directory.
     */
    outDir?: string;
    /**
     * Optional tsconfig path to use for builds. Defaults to the nearest tsconfig.build.json or tsconfig.json.
     */
    tsconfig?: string;
    /**
     * File name (or relative path) for the bootstrap file emitted inside the build output.
     */
    bootstrap?: string;
}

/**
 * HMR configuration used by the Seedcord CLI.
 */
export interface SeedcordHmrConfig {
    /**
     * Glob patterns for files that should trigger a full restart when changed.
     */
    restart?: string[];

    /**
     * Optional tsconfig path to use for type checking in dev mode. Defaults to the nearest tsconfig.json.
     */
    tsconfig?: string;
}

/**
 * Configuration used by the Seedcord CLI when running `seedcord dev` or `seedcord build`.
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
    /**
     * Entry file that should be executed when starting the bot (and copied into the build output).
     */
    entry: string;
    /**
     * Optional build configuration overrides.
     */
    build?: SeedcordBuildConfig;
    /**
     * Optional HMR configuration.
     */
    hmr?: SeedcordHmrConfig;
}

export interface ResolvedSeedcordBuildConfig {
    outDir: string;
    bootstrap: string;
    tsconfig?: string;
}

/**
 * Fully resolved configuration with absolute file system paths.
 */
export interface ResolvedSeedcordDevConfig extends Required<Omit<SeedcordDevConfig, 'build' | 'tsconfig' | 'hmr'>> {
    /**
     * Absolute path to the config file that produced this resolution.
     */
    configFile: string;
    /**
     * Resolved build options with absolute paths.
     */
    build: ResolvedSeedcordBuildConfig;
    /**
     * Optional tsconfig path to use for type checking in dev mode.
     */
    tsconfig?: string | undefined;
    /**
     * Optional HMR configuration.
     */
    hmr?: SeedcordHmrConfig;
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
