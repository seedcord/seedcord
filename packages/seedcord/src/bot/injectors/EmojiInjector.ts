import { Logger } from '@seedcord/services';
import chalk from 'chalk';

import type { Core } from '@interfaces/Core';
import type { ApplicationEmoji } from 'discord.js';

const emojiStorage: Record<string, ApplicationEmoji | string> = {};

/**
 * Emoji mapping interface. Augment this to add your project's emoji keys. Make sure to provide the same keys when configuring emojis in your bot config.
 *
 * @example
 * ```ts
 * declare module 'seedcord' {
 *   interface EmojiMap {
 *     ThumbsUp: string;
 *     ThumbsDown: string;
 *     Lol: string;
 *     Kek: string;
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * // Or extend it directly
 * declare module 'seedcord' {
 *  export interface EmojiMap extends MyEmojiMap {}
 * }
 * ```
 *
 * @example
 * ```ts
 * // Then, import and use it anywhere in your app
 * import { Emojis } from 'seedcord';
 *
 * console.log(Emojis.ThumbsUp); // '<:thumbsup:1872389747982323423>'
 * ```
 */
export interface EmojiMap {}

export type InjectedEmojiMap = {
    [K in keyof EmojiMap]: ApplicationEmoji | string;
};

/**
 * Global emoji mappings object
 *
 * @see {@link EmojiMap}
 */
export const Emojis = emojiStorage as InjectedEmojiMap;

export class EmojiInjector {
    private readonly logger = new Logger('Emojis');

    constructor(private readonly core: Core) {}

    public async init(): Promise<void> {
        this.clearEmojis();

        // Check if we have emoji config
        if (!this.core.config.bot.emojis || Object.keys(this.core.config.bot.emojis).length === 0) {
            this.logger.info(`${chalk.bold.green('Loaded')}: ${chalk.magenta.bold('0')} emojis`);
            return;
        }

        const configEmojis = this.core.config.bot.emojis;
        await this.core.bot.client.application?.emojis.fetch();

        let foundCount = 0;

        Object.entries(configEmojis).forEach(([key, emojiName]) => {
            if (typeof emojiName !== 'string') {
                this.logger.warn(
                    `${chalk.bold.yellow('Invalid')}: ${chalk.magenta.bold(String(key))} (expected string, received ${typeof emojiName})`
                );
                return;
            }

            const emoji = this.core.bot.client.application?.emojis.cache.find((e) => e.name === emojiName);

            if (emoji) {
                emojiStorage[key] = emoji;
                foundCount++;

                this.logger.debug(`${chalk.bold.green('Found')}: ${chalk.magenta.bold(emojiName)} (${emoji.id})`);

                return;
            }

            emojiStorage[key] = emojiName;
            this.logger.warn(
                `${chalk.bold.yellow('Missing')}: ${chalk.magenta.bold(emojiName)} (using provided string)`
            );
        });

        this.logger.info(`${chalk.bold.green('Loaded')}: ${chalk.magenta.bold(foundCount)} emoji(s)`);
    }

    private clearEmojis(): void {
        for (const key of Object.keys(emojiStorage)) Reflect.deleteProperty(emojiStorage, key);
    }
}
