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

    /**
     * Port the interactions server uses. `false` turns off the built-in server. Mount
     * `seedcord.fetch()` in your own server to answer requests.
     *
     * @defaultValue `3000`
     */
    port?: number | false;
}

/**
 * Config for a bot on Cloudflare Workers. Pass to `new Seedcord(config)`.
 */
export interface HttpEdgeConfig extends Config {
    bot: HttpBotConfig<Partial<TypedOmit<RESTOptions, EdgeSweeperKey>>>;
    port?: never;
    // an isolate does not run a coordinated shutdown
    lifecycle?: never;
}

/**
 * The http transport's configuration on either runtime.
 */
export type HttpConfig = HttpServerConfig | HttpEdgeConfig;
