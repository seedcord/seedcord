import type { InteractionHandler } from '#handlers/interaction/InteractionHandler';
import type { Repliables } from '#handlers/interactionTypes';
import type { BotConfig, Config, HealthCheckOption, InteractionsConfig, TypedConstructor } from '@seedcord/types';
import type { ClientOptions } from 'discord.js';

type UnhandledHandler = TypedConstructor<typeof InteractionHandler<Repliables>>;

/**
 * Djs Events handlers
 */
export type EventsConfig =
    | {
          /**
           * Path to dir containing event handlers.
           */
          path: string;
          /**
           * Optional path to event middleware directory
           */
          middlewares?: string;
      }
    | {
          /** No events configured */
          path: null;
      };

/**
 * The gateway transport's bot configuration, the shared {@link BotConfig} plus the pieces only a
 * gateway bot has, the discord.js client options and the gateway event handlers.
 */
export interface GatewayBotConfig extends BotConfig {
    interactions: InteractionsConfig<UnhandledHandler>;

    /**
     * Passed directly to the discord.js `Client` constructor.
     */
    clientOptions: ClientOptions;

    events: EventsConfig;
}

/**
 * The gateway transport's configuration, what the {@link Seedcord} constructor takes.
 */
export interface GatewayConfig extends Config {
    bot: GatewayBotConfig;

    /**
     * The health-check server. `false` disables it, `true` or omit for the defaults, an object
     * configures it.
     */
    healthCheck?: HealthCheckOption;
}
