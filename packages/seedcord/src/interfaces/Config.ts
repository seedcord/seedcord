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
   * Optional emoji mappings for the bot
   */
  emojis?: Record<string, string>;
}

/** Main configuration object for Seedcord bot */
export interface Config {
  bot: BotConfig;
  effects: EffectsConfig;
}
