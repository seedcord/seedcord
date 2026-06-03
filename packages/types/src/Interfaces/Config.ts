import type { EmojiMap } from './EmojiMap';
import type { ClientOptions, ColorResolvable } from 'discord.js';

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
           * Optional array of custom IDs or regex patterns to ignore in interaction handling
           */
          ignoreCustomIds?: (string | RegExp)[];
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
    events: EventsConfig;
    commands: CommandsConfig;

    /**
     * Discord.js ClientOptions passed directly to the Client constructor
     */
    clientOptions: ClientOptions;

    /**
     * Optional emoji mappings. Pass an object with emojis mappings (e.g. below). These emojis will be loaded from the Application Emojis that you've uploaded via the Dev-Dashboard
     *
     * Key: the object key name used in your codebase
     *
     * Value: The emoji identifier used in Discord
     *
     * @see {@link EmojiMap}
     * @see {@link Emojis}
     *
     * @example
     * ```ts
     * // This map's values...
     * const Emojis = {
     *   ThumbsUp: 'thumbsup',
     *   ThumbsDown: 'thumbsdown',
     *   Lol: 'lol_1',
     *   Kek: 'keklmao',
     * };
     * ```
     *
     * @example
     * ```ts
     * // ...turn into these Discord emojis
     * const Emojis = {
     *   ThumbsUp: '<:thumbsup:1872389747982323423>',
     *   ThumbsDown: '<:thumbsdown:1872389747982323424>',
     *   Lol: '<:lol_1:1872389747982323425>',
     *   Kek: '<a:keklmao:1872389747982323426>',
     * };
     * ```
     */
    emojis?: EmojiMap;
}

/**
 * Health-check HTTP server settings.
 */
export interface HealthCheckConfig {
    /**
     * Port the health-check server listens on.
     *
     * `6967` by default
     */
    port?: number;
    /**
     * Path the health-check server responds on.
     *
     * `/healthcheck` by default
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
     * `the developer` by default
     */
    developerUsername?: string;
}

/** Main configuration object for Seedcord bot */
export interface Config {
    bot: BotConfig;
    subscribers: SubscribersConfig;

    /**
     * Whether to show the error stack trace in the terminal in errors caught by the `@Catchable` decorator
     *
     * `false` by default
     */
    errorStack?: boolean;

    /**
     * Accent and embed color applied to every `BuilderComponent` (embeds, containers).
     *
     * Omit for Discord's default color.
     */
    botColor?: ColorResolvable;

    /**
     * Whether coordinated shutdown registers OS signal handlers and runs teardown tasks.
     *
     * `true` by default
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
}
