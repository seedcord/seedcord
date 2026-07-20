import type { CustomIdMatcher } from './CustomId';
import type { EmojiConfig } from './EmojiMap';
import type { ErrorsConfig } from './Errors';
import type { LoggerConfig } from './LogSink';
import type { Store } from './Store';
import type { BotColor } from '../Types/Colors';

// interactions, commands, services, bus subscribers

/**
 * Interaction handlers configuration
 */
export type InteractionsConfig =
    | {
          /**
           * Path to dir containing interaction handlers.
           */
          path: string;
          /**
           * Component customIds the controller skips instead of routing. A real `CustomId` (from
           * `@seedcord/core`) satisfies {@link CustomIdMatcher}, matched against the raw customId wire.
           */
          ignoreCustomIds?: CustomIdMatcher[];
          /**
           * Optional path to interaction middleware directory
           */
          middlewares?: string;
      }
    | {
          /** No interactions configured */
          path: null;
      };

/**
 * Slash commands and context menu commands
 */
export type CommandsConfig =
    | {
          /**
           * Path to dir containing commands and context menus to register.
           */
          path: string;
      }
    | {
          /** No commands configured */
          path: null;
      };

/**
 * Application subscribers configuration
 */
export type SubscribersConfig =
    | {
          /**
           * Path to dir of user defined subscribers (loaded onto core.bus).
           */
          path: string;
      }
    | {
          /** No bus subscribers configured (except the default ones) */
          path: null;
      };

/**
 * Discord bot configuration
 */
export interface BotConfig {
    interactions: InteractionsConfig;
    commands: CommandsConfig;

    /**
     * Optional emoji map. Each value is an emoji name loaded from your application emojis, or a
     * `[name, guildId]` tuple loaded from that guild (the guild needs the Guilds intent). Run
     * `seedcord codegen` after changing this to type the `Emojis` accessor.
     *
     * @see {@link EmojiConfig}
     * @see {@link Emojis}
     *
     * @example
     * ```ts
     * emojis: { ThumbsUp: 'thumbsup', Lol: ['lol_1', '1872389747982323426'] }
     * ```
     */
    emojis?: EmojiConfig;
}

/**
 * The transport configs' `healthCheck` field. `false` disables the health server, `true` and
 * `undefined` run it with the defaults, an object supplies {@link HealthCheckConfig} options.
 */
export type HealthCheckOption = boolean | HealthCheckConfig;

/**
 * Health-check HTTP server settings.
 */
export interface HealthCheckConfig {
    /**
     * Port the health-check server listens on.
     *
     * @defaultValue `6967`
     */
    port?: number;
    /**
     * Path the health-check server responds on.
     *
     * @defaultValue `'/health'`
     */
    path?: string;
    /**
     * Host/interface to bind. Omit to bind all interfaces.
     */
    host?: string;
}

/**
 * Settings for the messages the framework sends on unhandled errors.
 */
export interface NotificationsConfig {
    /**
     * Contact name shown in the generic unknown-error message.
     *
     * @defaultValue `'the developer'`
     */
    developerUsername?: string;
}

/** Main configuration object for Seedcord bot */
export interface Config {
    bot: BotConfig;
    subscribers: SubscribersConfig;

    /**
     * Settings for how the framework renders errors and reports faults.
     */
    errors?: ErrorsConfig;

    /**
     * Accent and embed color applied to every `BuilderComponent` (embeds, containers).
     *
     * Omit for Discord's default color.
     */
    botColor?: BotColor;

    /**
     * Settings for framework-sent error notifications.
     */
    notifications?: NotificationsConfig;

    /**
     * User ids the `OwnerOnly` gate treats as bot owners.
     */
    ownerIds?: string[];

    /**
     * The in-memory default resets on restart and is per-isolate on serverless. Pass a durable store
     * to keep framework state across restarts and isolates.
     */
    store?: Store<'charge'>;

    /**
     * Logging level, sinks, and per-channel overrides. Omitted fields keep the transport's defaults.
     */
    logger?: LoggerConfig;
}
