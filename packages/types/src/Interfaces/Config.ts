import type { CustomIdMatcher } from './CustomId';
import type { EmojiMap } from './EmojiMap';
import type { ErrorsConfig } from './Errors';
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
           * Component customIds the controller skips instead of routing. A real `CustomId` (from
           * `@seedcord/kit`) satisfies {@link CustomIdMatcher}, matched against the raw customId wire.
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
    botColor?: ColorResolvable;

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
