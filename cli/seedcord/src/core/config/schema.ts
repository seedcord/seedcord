/**
 * Build configuration used by the Seedcord CLI.
 */
export interface SeedcordBuildConfig {
    /**
     * Directory where build artifacts should be emitted.
     *
     * @defaultValue `./dist` relative to the config directory
     */
    outDir?: string;
    /**
     * Optional tsconfig path to use for builds.
     *
     * @defaultValue the nearest `tsconfig.build.json` or `tsconfig.json`
     */
    tsconfig?: string;
    /**
     * File name (or relative path) for the bootstrap file emitted inside the build output.
     */
    bootstrap?: string;
}

/**
 * Type-checking options for `seedcord dev`, passed as the object form of
 * {@link SeedcordHmrConfig.typecheck}.
 */
interface SeedcordTypecheckConfig {
    /**
     * Which tsconfig `tsc --watch` runs against.
     *
     * @defaultValue the nearest `tsconfig.json`
     */
    tsconfig?: string;
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
     * Whether a failed hot-reload rolls back to the last-good version of the file.
     *
     * @defaultValue `true`
     */
    rollback?: boolean;

    /**
     * Runs `tsc --watch` alongside the bot and reports type errors on the `tsc` channel.
     *
     * @defaultValue `false`
     */
    typecheck?: boolean | SeedcordTypecheckConfig;
}

/**
 * Configuration used by the Seedcord CLI when running `seedcord dev` or `seedcord build`.
 */
export interface SeedcordDevConfig {
    /**
     * Root directory used for resolving relative paths.
     *
     * @defaultValue the config directory
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
     * How `seedcord dev` exposes an http bot's interactions server. This has no effect on a gateway bot.
     *
     * `true` opens a cloudflared quick tunnel and writes the interactions endpoint on every run,
     * since the hostname changes each time. An https URL is one you already serve, through a named
     * cloudflared tunnel, a tailscale funnel, or any reverse proxy. The CLI checks that URL reaches
     * this process, writes the endpoint when the stored value differs, and leaves it in place.
     *
     * @defaultValue `true`
     */
    tunnel?: boolean | string;
    /**
     * Runs any always-on animations in `seedcord dev`.
     *
     * @defaultValue `true`
     */
    idleAnimation?: boolean;
    /**
     * Optional build configuration overrides.
     */
    build?: SeedcordBuildConfig;
    /**
     * Optional HMR configuration.
     */
    hmr?: SeedcordHmrConfig;
}

export type ResolvedTunnel = { mode: 'off' } | { mode: 'quick' } | { mode: 'url'; url: string };

export type ResolvedTypecheck = { enabled: false } | { enabled: true; tsconfig?: string };

export interface ResolvedSeedcordBuildConfig {
    outDir: string;
    bootstrap: string;
    tsconfig?: string;
}

/**
 * Fully resolved configuration with absolute file system paths.
 */
export interface ResolvedSeedcordDevConfig extends Required<Omit<SeedcordDevConfig, 'build' | 'hmr' | 'tunnel'>> {
    tunnel: ResolvedTunnel;
    /**
     * Absolute path to the config file that produced this resolution.
     */
    configFile: string;
    /**
     * Resolved build options with absolute paths.
     */
    build: ResolvedSeedcordBuildConfig;
    /**
     * Whether `tsc --watch` runs, with the tsconfig it runs against resolved to an absolute path.
     */
    typecheck: ResolvedTypecheck;
    /**
     * HMR configuration carried through from the user config (restart globs are matched as-is).
     */
    hmr?: SeedcordHmrConfig | undefined;
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
