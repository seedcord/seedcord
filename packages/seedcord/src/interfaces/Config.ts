import type { ClientOptions } from 'discord.js';

// interactions, events, commands, services, effects

/**
 * Djs Interactions handlers
 */
interface InteractionsConfig {
    /**
     * Path to dir containing interaction handlers.
     */
    path: string;
    ignoreCustomIds?: string[];
}

/**
 * Djs Events handlers
 */
interface EventsConfig {
    /**
     * Path to dir containing event handlers.
     */
    path: string;
}

/**
 * Djs SlashCommands and ContextMenuCommands
 */
interface CommandsConfig {
    /**
     * Path to dir containing commands and context menus to register.
     */
    path: string;
}

/**
 * Application side effects configuration
 */
interface EffectsConfig {
    /**
     * Path to dir of user defined side effects.
     */
    path: string;
}

/**
 * Discord bot configuration
 */
interface BotConfig {
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
     * @example
     * ```ts
     * const Emojis = {
     *   ThumbsUp: 'thumbsup',
     *   ThumbsDown: 'thumbsdown',
     *   Lol: 'lol_1',
     *   Kek: 'keklmao',
     * };
     * ```
     *
     * will turn into
     *
     * @example
     * ```ts
     * const Emojis = {
     *   ThumbsUp: '<:thumbsup:1872389747982323423>',
     *   ThumbsDown: '<:thumbsdown:1872389747982323424>',
     *   Lol: '<:lol_1:1872389747982323425>',
     *   Kek: '<a:keklmao:1872389747982323426>',
     * };
     * ```
     */
    emojis?: Record<string, string>;

    /**
     * Whether to show the error stack trace in the terminal in errors caught by the `@Catchable` decorator
     *
     * `false` by default
     */
    errorStack?: boolean;
}

/** Main configuration object for Seedcord bot */
export interface Config {
    bot: BotConfig;
    effects: EffectsConfig;
}
