import type { EdgeTarget, ServerTarget } from './detectTarget';
import type { TypedOmit } from '@seedcord/types';

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
     * The tsconfig that `seedcord build` type checks the project with.
     *
     * @defaultValue the `tsconfig.json` beside the config file
     */
    tsconfig?: string;
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
 * The `seedcord.config.ts` of a bot that runs on Cloudflare Workers. A bot that runs on node or
 * bun uses {@link SeedcordServerConfig}, the same fields plus `entry`.
 */
export interface SeedcordConfig {
    /**
     * Root directory used for resolving relative paths.
     *
     * @defaultValue the config directory
     */
    root?: string;
    /**
     * Path to the module whose default export is a configured `Seedcord` instance.
     */
    instance: string;
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

/**
 * The `seedcord.config.ts` of a bot that runs on node or bun.
 */
export interface SeedcordServerConfig extends SeedcordConfig {
    /**
     * The file that starts the bot, the one that calls `start()`.
     */
    entry: string;
}

export type ResolvedTunnel = { mode: 'off' } | { mode: 'quick' } | { mode: 'url'; url: string };

export type ResolvedTarget = (ServerTarget & { entry: string }) | EdgeTarget;

export type ResolvedTypecheck = { enabled: false } | { enabled: true; tsconfig?: string };

export interface ResolvedSeedcordBuildConfig {
    outDir: string;
    tsconfig?: string;
}

// every path in here is absolute
export interface ResolvedSeedcordConfig extends Required<TypedOmit<SeedcordConfig, 'build' | 'hmr' | 'tunnel'>> {
    tunnel: ResolvedTunnel;
    configFile: string;
    target: ResolvedTarget;
    build: ResolvedSeedcordBuildConfig;
    typecheck: ResolvedTypecheck;
    // restart globs pass through unresolved
    hmr?: SeedcordHmrConfig | undefined;
}

/**
 * Supported configuration filenames discovered by the CLI.
 */
export const SEEDCORD_CONFIG_FILENAMES = ['seedcord.config.ts', 'seedcord.config.mts'] as const;

/**
 * Types the `seedcord.config.ts` of a bot that runs on node or bun.
 */
export function defineConfig(config: SeedcordServerConfig): SeedcordServerConfig {
    return config;
}
