import type { EmojiMap } from './EmojiMap';
import type { ClientOptions } from 'discord.js';

// interactions, events, commands, services, effects

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
 * Application side effects configuration
 */
export type EffectsConfig =
    | {
          /**
           * Path to dir of user defined side effects.
           */
          path: string;
      }
    | {
          /** No effects configured (except the default effects) */
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
     * Key: The name of the object key you want to use in your codebase
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

/** Main configuration object for Seedcord bot */
export interface Config {
    bot: BotConfig;
    effects: EffectsConfig;

    /**
     * Whether to show the error stack trace in the terminal in errors caught by the `@Catchable` decorator
     *
     * `false` by default
     */
    errorStack?: boolean;
}
