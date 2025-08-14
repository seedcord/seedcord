import type { ClientOptions } from 'discord.js';

// interactions, events, commands, services, hooks

/**
 * Discord interaction hooks configuration
 */
interface InteractionsConfig {
  /**
   * Path for interaction hooks, such as slash commands and buttons.
   */
  path: string;
}

/**
 * Discord event hooks configuration
 */
interface EventsConfig {
  /**
   * Path for event hooks.
   */
  path: string;
}

/**
 * Discord command registry configuration
 */
interface CommandsConfig {
  /**
   * Path for command hooks.
   */
  path: string;
}

/**
 * Discord hook hooks configuration
 */
interface HooksConfig {
  /**
   * Path for hook hooks.
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
   * Optional emoji mappings for the bot
   */
  emojis?: Record<string, string>;
}

export interface Config {
  bot: BotConfig;
  hooks: HooksConfig;
}
