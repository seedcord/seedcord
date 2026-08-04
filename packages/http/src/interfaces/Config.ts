import type { Config, HealthCheckConfig, TypedOmit } from '@seedcord/types';

/**
 * Config for a long-running node server. Pass to `new Seedcord(config).start(port)`.
 */
export interface HttpServerConfig extends Config {
    runtime?: 'server';

    /**
     * The health endpoint, served by the interactions server on the path given here.
     *
     * @defaultValue `'/health'`
     */
    healthCheck?: TypedOmit<HealthCheckConfig, 'port' | 'host'>;
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
