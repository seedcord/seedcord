import type { RealPath } from '#core/project/realPath';
import type { EdgeTarget, ServerTarget } from './detectTarget';
import type { VitePlugins } from './vitePlugins';
import type { TakenName, TemplateHelper } from '@seedcord/cli-templates/helper-names';
import type { TypedOmit } from '@seedcord/types';
import type { PluginOption } from 'vite';

/**
 * Build options every bot takes. An edge bot takes only these, because `@cloudflare/vite-plugin`
 * writes its worker to `.cloudflare/output`.
 */
export interface SeedcordBaseBuildConfig {
    /**
     * The tsconfig that `seedcord build` type checks the project with.
     *
     * @defaultValue the `tsconfig.json` beside the config file
     */
    tsconfig?: string;
}

/**
 * Build options for a bot that runs on node or bun.
 */
export interface SeedcordBuildConfig extends SeedcordBaseBuildConfig {
    /**
     * Directory where build artifacts should be emitted.
     *
     * @defaultValue `./dist` relative to the config directory
     */
    outDir?: string;
    /**
     * The file that starts the bot, the one that calls `start()`. The build's `index.mjs` runs it.
     * Without it, `index.mjs` default exports the bot for your own node server to import and start.
     */
    start?: string;
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
 * Handlebars helpers your templates can call, like `{{ shout name }}`. A helper named after one that
 * seedcord or Handlebars ships, or after a value seedcord fills in like `name`, is a compile error.
 */
export type SeedcordMakeHelpers = Record<string, TemplateHelper> & {
    [Name in TakenName]?: `templates already use ${Name}. Pick another name.`;
};

/**
 * Options for `seedcord make`.
 */
export interface SeedcordMakeConfig {
    /**
     * The folder that holds your templates. Each folder inside it is one template.
     *
     * @defaultValue `./templates` beside the config file
     */
    templates?: string;
    /**
     * Helpers your templates can call on top of the ones seedcord ships.
     */
    helpers?: SeedcordMakeHelpers;
}

/**
 * The `seedcord.config.ts` of a bot that runs on Cloudflare Workers. A bot that runs on node or
 * bun uses {@link SeedcordServerConfig}. Its `build` also takes `outDir` and `start`.
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
     * Folders whose non-code files `seedcord build` bundles for `readFiles` to read, like `['./locales']`.
     * Each one includes its subfolders and resolves against `root`. A folder can sit beside `root`, like `'../assets'`
     * with `root: './src'`, as long as it is inside the folder that holds this config.
     *
     * @defaultValue `[]`
     */
    files?: string[];
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
     * The port `seedcord dev` serves the worker's interactions endpoint on. `0` picks a free port
     * on each run. A `tunnel` URL needs a fixed port.
     *
     * @defaultValue `3000`
     */
    port?: number;
    /**
     * Runs any always-on animations in `seedcord dev`.
     *
     * @defaultValue `true`
     */
    idleAnimation?: boolean;
    /**
     * Optional build configuration overrides.
     */
    build?: SeedcordBaseBuildConfig;
    /**
     * Optional HMR configuration.
     */
    hmr?: SeedcordHmrConfig;
    /**
     * A function that returns the Vite plugins to run on your bot's code in every `seedcord` command
     * that loads it, like `() => [yaml()]`. They change what an import loads, like turning a `.yaml`
     * file into an object. seedcord calls it once for each Vite server and build.
     */
    vitePlugins?: () => PluginOption[];
    /**
     * Options for `seedcord make`.
     */
    make?: SeedcordMakeConfig;
}

/**
 * The `seedcord.config.ts` of a bot that runs on node or bun.
 */
export interface SeedcordServerConfig extends SeedcordConfig {
    /**
     * Optional build configuration overrides.
     */
    build?: SeedcordBuildConfig;
    /**
     * A node http bot sets its port in `new Seedcord({ port })`.
     */
    port?: never;
}

export type ResolvedTunnel = { mode: 'off' } | { mode: 'quick' } | { mode: 'url'; url: string };

export type ResolvedEdgeTarget = EdgeTarget & { port: number };

export type ResolvedServerTarget = ServerTarget & { start: RealPath | undefined; outDir: RealPath };

export type ResolvedTarget = ResolvedServerTarget | ResolvedEdgeTarget;

export type ResolvedTypecheck = { enabled: false } | { enabled: true; tsconfig?: RealPath };

export interface ResolvedSeedcordBuildConfig {
    tsconfig?: RealPath;
}

interface ResolvedSeedcordMakeConfig {
    templates: RealPath;
    helpers: SeedcordMakeHelpers;
}

export interface ResolvedSeedcordConfig extends Required<
    TypedOmit<
        SeedcordConfig,
        'build' | 'hmr' | 'tunnel' | 'port' | 'vitePlugins' | 'root' | 'instance' | 'files' | 'make'
    >
> {
    make: ResolvedSeedcordMakeConfig;
    root: RealPath;
    instance: RealPath;
    files: RealPath[];
    tunnel: ResolvedTunnel;
    vitePlugins: VitePlugins;
    configFile: RealPath;
    target: ResolvedTarget;
    build: ResolvedSeedcordBuildConfig;
    typecheck: ResolvedTypecheck;
    viteMode: string;
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
