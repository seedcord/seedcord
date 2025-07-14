import chalk from 'chalk';
import { Bot } from '../bot/Bot';
import { Database } from './database/Database';
import { HookController } from './hooks/HookController';
import { Core } from './library/interfaces/Core';

import { LogService } from './services/LogService';

export class CoreBot implements Core {
  private logger = new LogService('CoreBot');
  private isInitialized = false;

  public readonly db: Database = new Database(this);
  public readonly hooks: HookController = new HookController(this);
  public readonly bot: Bot = new Bot(this);

  constructor() {}

  public async start(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.logger.info(chalk.bold('Starting Database'));
    await this.db.start();
    this.logger.info(chalk.bold('Database started'));

    this.logger.info(chalk.bold('Initializing Hooks'));
    await this.hooks.init();
    this.logger.info(chalk.bold('Hooks initialized'));

    this.logger.info(chalk.bold('Starting Bot'));
    await this.bot.start();
    this.logger.info(chalk.bold('Bot started'));
  }
}
