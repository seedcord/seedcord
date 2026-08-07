import { accessorStore, clearStore, guardedAccessor, isEmojiTuple } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';

import type { Core } from '@interfaces/Core';
import type { EmojiMap } from '@seedcord/types';
import type { ApplicationEmoji, GuildEmoji } from 'discord.js';

type SavedEmojiType = GuildEmoji | ApplicationEmoji;

const emojiStorage = accessorStore<SavedEmojiType>();

/**
 * The global {@link Emojis} accessor type. Each key resolves to its precise class, `GuildEmoji` for a `'guild'`
 * tag and `ApplicationEmoji` for an `'application'` tag, the tags `seedcord codegen` writes into {@link EmojiMap}.
 */
export type InjectedEmojiMap = {
    [K in keyof EmojiMap]: EmojiMap[K] extends 'guild' ? GuildEmoji : ApplicationEmoji;
};

/**
 * The bot's resolved emojis, keyed by {@link EmojiMap}. Filled by {@link EmojiInjector} during startup.
 * A read before that throws.
 */
export const Emojis = guardedAccessor('Emojis', emojiStorage) as InjectedEmojiMap;

// a guild emoji requires the Guilds intent in the client options
export class EmojiInjector {
    private readonly logger = new Logger('Emojis', { channel: 'bot' });

    constructor(private readonly core: Core) {}

    public async init(): Promise<void> {
        this.clearEmojis();

        if (!this.core.config.bot.emojis || Object.keys(this.core.config.bot.emojis).length === 0) {
            this.logger.debug('No emojis configured, skipping emoji injection.');
            return;
        }

        const configEmojis = this.core.config.bot.emojis;
        await this.core.bot.client.application?.emojis.fetch();

        const failures: string[] = [];
        const fetchedGuilds = new Set<string>();
        for (const [key, value] of Object.entries(configEmojis)) {
            if (isEmojiTuple(value)) {
                await this.resolveTuple(key, value, failures, fetchedGuilds);
            } else if (typeof value === 'string') {
                this.resolveString(key, value, failures);
            } else {
                failures.push(`  - "${key}" has an invalid value (expected a name or [name, guildId])`);
            }
        }

        if (failures.length > 0) {
            throw new SeedcordError(SeedcordErrorCode.ConfigEmojiUnresolved, [failures.length, failures.join('\n')]);
        }

        this.logger.utils.summary('Loaded emojis', { emojis: Object.keys(emojiStorage).length });
    }

    private async resolveTuple(
        key: string,
        value: readonly [string, string],
        failures: string[],
        fetchedGuilds: Set<string>
    ): Promise<void> {
        const [emojiName, guildId] = value;

        const guild = this.core.bot.client.guilds.cache.get(guildId);
        if (!guild) {
            failures.push(
                `  - "${emojiName}" for "${key}" targets guild ${guildId}, which is not available (check the Guilds intent)`
            );
            return;
        }

        if (!fetchedGuilds.has(guildId)) {
            await guild.emojis.fetch();
            fetchedGuilds.add(guildId);
        }
        const guildEmoji = guild.emojis.cache.find((e) => e.name === emojiName);
        if (!guildEmoji) {
            failures.push(`  - "${emojiName}" for "${key}" was not found in guild ${guildId}`);
            return;
        }

        emojiStorage[key] = guildEmoji;
    }

    private resolveString(key: string, emojiName: string, failures: string[]): void {
        const appEmoji = this.core.bot.client.application?.emojis.cache.find((e) => e.name === emojiName);
        if (!appEmoji) {
            failures.push(`  - "${emojiName}" for "${key}" was not found among the application emojis`);
            return;
        }

        emojiStorage[key] = appEmoji;
    }

    private clearEmojis(): void {
        clearStore(emojiStorage);
    }
}
