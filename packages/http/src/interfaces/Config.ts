import type { InteractionHandler } from '#handlers/interaction/InteractionHandler';
import type { Repliables } from '#handlers/interactionTypes';
import type { RESTOptions } from '@discordjs/rest';
import type {
    BotConfig,
    Config,
    InteractionsConfig,
    ServerConfig,
    ServerHostConfig,
    TypedConstructor
} from '@seedcord/types';
import type { Except } from 'type-fest';

export type UnhandledHandler = TypedConstructor<typeof InteractionHandler<Repliables>>;

// workerd throws when a timer starts at a worker's global scope
export type EdgeSweeperKey = 'hashSweepInterval' | 'handlerSweepInterval';

interface HttpBotConfig<Options> extends BotConfig {
    interactions: InteractionsConfig<UnhandledHandler>;

    /**
     * Passed to the `REST` client from `@discordjs/rest`.
     */
    restOptions?: Options;
}

/**
 * Config for a long-running node server. Pass to `new Seedcord(config).start()`.
 */
export interface HttpServerConfig extends ServerHostConfig {
    bot: HttpBotConfig<Partial<RESTOptions>>;
}

/**
 * Config for a bot on Cloudflare Workers. Pass to `new Seedcord(config)`.
 */
export interface HttpEdgeConfig extends Config {
    bot: HttpBotConfig<Partial<Except<RESTOptions, EdgeSweeperKey>>>;
    /** A Worker only sets its `url` because Cloudflare runs the server. */
    server?: Pick<ServerConfig, 'url'>;
    // an isolate does not run a coordinated shutdown
    lifecycle?: never;
}

/**
 * The http transport's configuration on either runtime.
 */
export type HttpConfig = HttpServerConfig | HttpEdgeConfig;
