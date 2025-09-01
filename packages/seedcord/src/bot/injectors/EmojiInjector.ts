import { Logger } from '@seedcord/services';
import chalk from 'chalk';

import type { Core } from '../../interfaces/Core';

export class EmojiInjector {
  private readonly logger = new Logger('Emojis');

  constructor(private readonly core: Core) {}

  public async init(): Promise<void> {
    // Check if we have emoji config
    if (!this.core.config.bot.emojis || Object.keys(this.core.config.bot.emojis).length === 0) {
      this.logger.info(`${chalk.bold.green('Loaded')}: ${chalk.magenta.bold('0')} emojis`);
      return;
    }

    const configEmojis = this.core.config.bot.emojis;
    await this.core.bot.client.application?.emojis.fetch();

    let foundCount = 0;

    Object.entries(configEmojis).forEach(([key, emojiName]) => {
      const emoji = this.core.bot.client.application?.emojis.cache.find((e) => e.name === emojiName);

      if (emoji) {
        configEmojis[key] = `<${emoji.identifier}>`;

        foundCount++;

        this.logger.debug(`${chalk.bold.green('Found')}: ${chalk.magenta.bold(emojiName)} (${emoji.id})`);
      }
    });

    this.logger.info(`${chalk.bold.green('Loaded')}: ${chalk.magenta.bold(foundCount)} emojis`);
  }
}
