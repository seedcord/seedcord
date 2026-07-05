import type { CustomIdMatcher } from './CustomId';
import type { EmojiConfig } from './EmojiMap';
import type { ErrorsConfig } from './Errors';
import type { BotColor } from '../Types/Colors';

// interactions, events, commands, services, bus subscribers

/**
 * Djs Interactions handlers
 *
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
 * Djs SlashCommands and ContextMenuCommands
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
     * @defaultValue `'/healthcheck'`
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
     * Whether coordinated shutdown registers OS signal handlers and runs teardown tasks.
     *
     * @defaultValue `true`
     */
    shutdownEnabled?: boolean;

    /**
     * Health-check HTTP server settings.
     */
    healthCheck?: HealthCheckConfig;

    /**
     * Settings for framework-sent error notifications.
     */
    notifications?: NotificationsConfig;

    /**
     * User ids the `OwnerOnly` gate treats as bot owners.
     */
    ownerIds?: string[];
}
