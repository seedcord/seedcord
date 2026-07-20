import type { Config, HealthCheckOption } from '@seedcord/types';

/**
 * A long-running node deployment, run with `new Seedcord(config).start(port)`.
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
 * A bundled isolate deployment. `seedcord build` generates the worker entry around
 * `createSeedcord`, node-server options are compile errors on this arm.
 */
export interface HttpEdgeConfig extends Config {
    runtime: 'edge';
    healthCheck?: never;
}

/**
 * The http transport's configuration, discriminated on `runtime`.
 */
export type HttpConfig = HttpServerConfig | HttpEdgeConfig;
