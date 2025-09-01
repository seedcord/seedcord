import { HealthCheck, CoordinatedShutdown, CoordinatedStartup, StartupPhase } from '@seedcord/services';
import chalk from 'chalk';

import { Bot } from './bot/Bot';
import { EffectsRegistry } from './effects/EffectsRegistry';
import { Pluggable } from './interfaces/Plugin';

import type { Config } from './interfaces/Config';
import type { Core } from './interfaces/Core';

/**
 * Main Seedcord bot framework class
 *
 * Primary entry point for creating Discord bots with Seedcord.
 * Manages component lifecycle and provides plugin support.
 */
export class Seedcord extends Pluggable implements Core {
  private static isInstantiated = false;
  /** @see {@link CoordinatedShutdown} */
  public override readonly shutdown: CoordinatedShutdown;

  /** @see {@link CoordinatedStartup} */
  public override readonly startup: CoordinatedStartup;

  /** @see {@link EffectsRegistry} */
  public readonly effects: EffectsRegistry;

  /** @see {@link Bot} */
  public readonly bot: Bot;

  /** @see {@link HealthCheck} */
  private readonly healthCheck: HealthCheck;

  /**
   * Creates a new Seedcord instance
   *
   * @param config - Bot configuration including paths and Discord client options
   * @throws An {@link Error} When attempting to create multiple instances (singleton)
   */
  constructor(public readonly config: Config) {
    // Create lifecycle instances
    const shutdown = new CoordinatedShutdown();
    const startup = new CoordinatedStartup();

    // Pass them to parent constructor
    super(shutdown, startup);

    // Store references for public access
    this.shutdown = shutdown;
    this.startup = startup;

    if (Seedcord.isInstantiated) {
      throw new Error('Seedcord can only be instantiated once. Use the existing instance instead.');
    }
    Seedcord.isInstantiated = true;

    this.effects = new EffectsRegistry(this as unknown as Core);
    this.bot = new Bot(this as unknown as Core);
    this.healthCheck = new HealthCheck(this.shutdown);

    this.registerStartupTasks();
  }

  /**
   * Registers default startup tasks
   * @internal
   */
  private registerStartupTasks(): void {
    this.startup.addTask(StartupPhase.Configuration, 'Effect Initialization', async () => {
      this.effects.logger.info(chalk.bold('Initializing'));
      await this.effects.init();
      this.effects.logger.info(chalk.bold('Initialized'));
    });

    this.startup.addTask(StartupPhase.Instantiation, 'Bot Initialization', async () => {
      this.bot.logger.info(chalk.bold('Initializing'));
      await this.bot.init();
      this.bot.logger.info(chalk.bold('Initialized'));
    });

    this.startup.addTask(StartupPhase.Ready, 'Health Check', async () => {
      this.healthCheck.logger.info(chalk.bold('Initializing'));
      await this.healthCheck.init();
      this.healthCheck.logger.info(chalk.bold('Initialized'));
    });
  }

  /**
   * Starts the bot and runs all initialization tasks
   *
   * @returns This Seedcord instance when fully initialized
   */
  public async start(): Promise<this> {
    await super.init();
    return this;
  }
}
