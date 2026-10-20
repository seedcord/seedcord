import { ResolvedEmoji } from '@seedcord/core';
import { accessorStore, clearStore, guardedAccessor, isEmojiTuple } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';

import type { Core } from '#interfaces/Core';
import type { EmojiMap } from '@seedcord/types';
import type { ApplicationEmoji, GuildEmoji } from 'discord.js';

type SavedEmojiType = GuildEmoji | ApplicationEmoji;

/** A resolved emoji, plus the discord.js emoji it came from on {@link GatewayEmoji.source}. */
export class GatewayEmoji<Source extends SavedEmojiType = SavedEmojiType> extends ResolvedEmoji {
    // Object.entries skips a private field
    readonly #source: Source;

    constructor(source: Source) {
        super(source.name, source.id, source.animated);
        this.#source = source;
    }

    /** What discord.js resolved, for `.url` and the management calls. */
    public get source(): Source {
        return this.#source;
    }
}

const emojiStorage = accessorStore<GatewayEmoji>();

/**
 * The global {@link Emojis} accessor type. Each key's `source` resolves to its precise class, `GuildEmoji`
 * for a `'guild'` tag and `ApplicationEmoji` for an `'application'` tag, the tags `seedcord codegen`
 * writes into {@link EmojiMap}.
 */
export type InjectedEmojiMap = {
    [K in keyof EmojiMap]: EmojiMap[K] extends 'guild' ? GatewayEmoji<GuildEmoji> : GatewayEmoji<ApplicationEmoji>;
};

/**
 * The bot's resolved emojis, keyed by {@link EmojiMap}. Filled by {@link EmojiInjector} during startup.
 *
 * @throws A **SeedcordError** when you read a key the injector did not fill.
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

        const problems: Error[] = [];
        const fetchedGuilds = new Set<string>();
        for (const [key, value] of Object.entries(configEmojis)) {
            if (isEmojiTuple(value)) {
                await this.resolveTuple(key, value, problems, fetchedGuilds);
            } else if (typeof value === 'string') {
                this.resolveString(key, value, problems);
            } else {
                problems.push(new SeedcordTypeError(SeedcordErrorCode.ConfigEmojiInvalid, [key]));
            }
        }

        throwSingleOrAggregate(problems, SeedcordErrorCode.ConfigEmojiUnresolved);

        this.logger.utils.summary('Loaded emojis', { emojis: Object.keys(emojiStorage).length });
    }

    private async resolveTuple(
        key: string,
        value: readonly [string, string],
        problems: Error[],
        fetchedGuilds: Set<string>
    ): Promise<void> {
        const [emojiName, guildId] = value;

        const guild = this.core.bot.client.guilds.cache.get(guildId);
        if (!guild) {
            problems.push(
                new SeedcordError(SeedcordErrorCode.ConfigEmojiSourceUnreadable, [
                    key,
                    emojiName,
                    `guild ${guildId}`,
                    'discord.js has no cached guild with that id',
                    'Check that the bot is in that guild, and that clientOptions.intents includes GatewayIntentBits.Guilds.'
                ])
            );
            return;
        }

        if (!fetchedGuilds.has(guildId)) {
            await guild.emojis.fetch();
            fetchedGuilds.add(guildId);
        }
        const guildEmoji = guild.emojis.cache.find((e) => e.name === emojiName);
        if (!guildEmoji) {
            problems.push(
                new SeedcordError(SeedcordErrorCode.ConfigEmojiNotFound, [key, emojiName, `guild ${guildId}`])
            );
            return;
        }

        emojiStorage[key] = new GatewayEmoji(guildEmoji);
    }

    private resolveString(key: string, emojiName: string, problems: Error[]): void {
        const appEmoji = this.core.bot.client.application?.emojis.cache.find((e) => e.name === emojiName);
        if (!appEmoji) {
            problems.push(
                new SeedcordError(SeedcordErrorCode.ConfigEmojiNotFound, [key, emojiName, 'the application'])
            );
            return;
        }

        emojiStorage[key] = new GatewayEmoji(appEmoji);
    }

    private clearEmojis(): void {
        clearStore(emojiStorage);
    }
}
