import type { Config, HealthCheckOption } from '@seedcord/types';

/**
 * Config for a long-running node server. Pass to `new Seedcord(config).start(port)`.
 */
export interface HttpServerConfig extends Config {
    runtime?: 'server';

    /**
     * The health-check server. `false` disables it, `true` or omit for the defaults, an object
     * configures it.
     */
    healthCheck?: HealthCheckOption;
}

/**
 * Config for a bundled isolate deployment. `seedcord build` generates a worker entry that calls
 * `createSeedcord`.
 */
export interface HttpEdgeConfig extends Config {
    runtime: 'edge';
    healthCheck?: never;
}

/**
 * The http transport's configuration, discriminated on `runtime`.
 */
export type HttpConfig = HttpServerConfig | HttpEdgeConfig;
