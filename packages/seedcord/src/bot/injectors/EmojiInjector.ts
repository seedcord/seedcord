import { Logger } from '@seedcord/services';
import chalk from 'chalk';

import type { Core } from '@interfaces/Core';
import type { EmojiMap } from '@seedcord/types';
import type { ApplicationEmoji, GuildEmoji } from 'discord.js';

/**
 * Type representing a saved emoji, which can be a GuildEmoji, ApplicationEmoji, or a string identifier if emoji isn't resolved.
 */
export type SavedEmojiType = GuildEmoji | ApplicationEmoji | string;

const emojiStorage: Record<string, SavedEmojiType> = {};

/**
 * Emoji config values can be either a plain name or a tuple [name, guildId]
 *
 * @internal
 */
export type EmojiConfigValue = string | readonly [string, string];

function isEmojiTuple(v: unknown): v is readonly [string, string] {
    return Array.isArray(v) && v.length === 2 && typeof v[0] === 'string' && typeof v[1] === 'string';
}

/**
 * Injected emoji mapping type, where each key from {@link EmojiMap} corresponds to a {@link SavedEmojiType}.
 */
export type InjectedEmojiMap = {
    [K in keyof EmojiMap]: SavedEmojiType;
};

/**
 * Global emoji mappings object
 *
 * @see {@link EmojiMap}
 */
export const Emojis = emojiStorage as InjectedEmojiMap;

/**
 * Loads and injects emojis based on bot configuration.
 *
 * For emojis injected from specific guilds, ensure that the Guilds intent is provided in client options.
 *
 * @internal
 */
export class EmojiInjector {
    private readonly logger = new Logger('Emojis');

    constructor(private readonly core: Core) {}

    public async init(): Promise<void> {
        this.clearEmojis();

        if (!this.core.config.bot.emojis || Object.keys(this.core.config.bot.emojis).length === 0) {
            this.logger.info(chalk.bold.yellow('No emojis configured, skipping emoji injection.'));
            return;
        }

        const configEmojis = this.core.config.bot.emojis as Record<keyof EmojiMap, EmojiConfigValue>;
        await this.core.bot.client.application?.emojis.fetch();

        let foundCount = 0;

        const entries = Object.entries(configEmojis);
        for (const [key, value] of entries) {
            // tuple path [name, guildId]
            if (isEmojiTuple(value)) {
                foundCount += this.handleTuple(key, value);
                continue;
            }

            // string path, check application emojis only
            if (typeof value === 'string') {
                foundCount += this.handleString(key, value);
                continue;
            }

            // invalid config value
            this.logger.warn(
                `${chalk.bold.yellow('Invalid')}: ${chalk.magenta.bold(String(key))} (expected string or [string, string])`
            );
        }

        this.logger.utils.summary('Loaded emojis', { emojis: foundCount });
    }

    /**
     * Tuple `[emojiName, guildId]`: looks up the emoji in that guild. Returns 1 when found and stored as an emoji object, otherwise 0.
     */
    private handleTuple(key: string, value: readonly [string, string]): number {
        const [emojiName, guildId] = value;

        const guild = this.core.bot.client.guilds.cache.get(guildId);
        if (!guild) {
            emojiStorage[key] = emojiName;
            this.logger.warn(
                `${chalk.bold.yellow('Missing')}: ${chalk.magenta.bold(emojiName)} in guild ${chalk.gray(
                    guildId
                )} (guild not in cache or not found, using provided string)`
            );
            return 0;
        }

        const guildEmoji = guild.emojis.cache.find((e) => e.name === emojiName);
        if (guildEmoji) {
            emojiStorage[key] = guildEmoji;
            this.logger.debug(
                `${chalk.bold.green('Found')}: ${chalk.magenta.bold(emojiName)} (${guildEmoji.id}) in guild ${chalk.gray(
                    guildId
                )}`
            );
            return 1;
        }

        emojiStorage[key] = emojiName;
        this.logger.warn(
            `${chalk.bold.yellow('Missing')}: ${chalk.magenta.bold(emojiName)} in guild ${chalk.magenta.bold(guildId)} (using provided string)`
        );

        return 0;
    }

    /**
     * Handle emoji config values provided as a simple string (application emoji lookup).
     * Returns 1 when the emoji was found and stored as an emoji object, otherwise 0.
     */
    private handleString(key: string, emojiName: string): number {
        const appEmoji = this.core.bot.client.application?.emojis.cache.find((e) => e.name === emojiName);

        if (appEmoji) {
            emojiStorage[key] = appEmoji;
            this.logger.debug(`${chalk.bold.green('Found')}: ${chalk.magenta.bold(emojiName)} (${appEmoji.id})`);
            return 1;
        }

        emojiStorage[key] = emojiName;
        this.logger.warn(`${chalk.bold.yellow('Missing')}: ${chalk.magenta.bold(emojiName)} (using provided string)`);
        return 0;
    }

    private clearEmojis(): void {
        for (const key of Object.keys(emojiStorage)) Reflect.deleteProperty(emojiStorage, key);
    }
}
