import type { RESTOptions } from '@discordjs/rest';
import type { BotConfig, Config, TypedOmit } from '@seedcord/types';

// workerd throws when a timer starts at a worker's global scope
export type EdgeSweeperKey = 'hashSweepInterval' | 'handlerSweepInterval';

interface HttpBotConfig<Options> extends BotConfig {
    /**
     * Passed to the `REST` client from `@discordjs/rest`.
     */
    restOptions?: Options;
}

/**
 * Config for a long-running node server. Pass to `new Seedcord(config).start()`.
 */
export interface HttpServerConfig extends Config {
    bot: HttpBotConfig<Partial<RESTOptions>>;
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
    bot: HttpBotConfig<Partial<TypedOmit<RESTOptions, EdgeSweeperKey>>>;
    runtime: 'edge';
    port?: never;
    // an isolate does not run a coordinated shutdown
    lifecycle?: never;
}

/**
 * The http transport's configuration, discriminated on `runtime`.
 */
export type HttpConfig = HttpServerConfig | HttpEdgeConfig;
