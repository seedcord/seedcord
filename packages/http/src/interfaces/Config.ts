import type { RESTOptions } from '@discordjs/rest';
import type { BotConfig, Config } from '@seedcord/types';

interface HttpBotConfig extends BotConfig {
    /**
     * Passed to the `REST` client from `@discordjs/rest`.
     *
     * On edge, `hashSweepInterval` and `handlerSweepInterval` default to `0`. Keep them there,
     * otherwise workerd throws when a timer starts at a worker's global scope.
     */
    restOptions?: Partial<RESTOptions>;
}

/**
 * Config for a long-running node server. Pass to `new Seedcord(config).start()`.
 */
export interface HttpServerConfig extends Config {
    bot: HttpBotConfig;
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
    bot: HttpBotConfig;
    runtime: 'edge';
    port?: never;
    // an isolate does not run a coordinated shutdown
    lifecycle?: never;
}

/**
 * The http transport's configuration, discriminated on `runtime`.
 */
export type HttpConfig = HttpServerConfig | HttpEdgeConfig;
