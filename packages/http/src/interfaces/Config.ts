import type { Config } from '@seedcord/types';

/**
 * Config for a long-running node server. Pass to `new Seedcord(config).start()`.
 */
export interface HttpServerConfig extends Config {
    runtime?: 'server';

    /**
     * Port the interactions server uses.
     *
     * @defaultValue `3000`
     */
    port?: number;
}

/**
 * Config for a bundled isolate deployment. `seedcord build` generates a worker entry that calls
 * `createSeedcord`.
 */
export interface HttpEdgeConfig extends Config {
    runtime: 'edge';
    port?: never;
}

/**
 * The http transport's configuration, discriminated on `runtime`.
 */
export type HttpConfig = HttpServerConfig | HttpEdgeConfig;
