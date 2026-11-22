import { ResolvedEmoji } from '@seedcord/core';
import {
    accessorStore,
    clearStore,
    emojiNotFound,
    emojiUnreadable,
    expectedEmojis,
    guardedAccessor
} from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { throwSingleOrAggregate } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';

import type { Core } from '#interfaces/Core';
import type { ExpectedEmoji } from '@seedcord/core/internal';
import type { EmojiMap } from '@seedcord/types';
import type { ApplicationEmoji, GuildEmoji } from 'discord.js';
import type { ExtractStrict } from 'type-fest';

type SavedEmojiType = GuildEmoji | ApplicationEmoji;
type GuildExpected = ExtractStrict<ExpectedEmoji, { kind: 'guild' }>;
type ApplicationExpected = ExtractStrict<ExpectedEmoji, { kind: 'application' }>;

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

        const expected = await expectedEmojis(this.core.config.bot.emojis);
        if (expected.length === 0) {
            this.logger.debug('No emojis configured, skipping emoji injection.');
            return;
        }

        await this.core.bot.client.application?.emojis.fetch();

        const problems: Error[] = [];
        const fetchedGuilds = new Set<string>();
        for (const emoji of expected) {
            const found = emoji.kind === 'guild' ? await this.inGuild(emoji, fetchedGuilds) : this.inApplication(emoji);
            if (Error.isError(found)) problems.push(found);
            else emojiStorage[emoji.key] = new GatewayEmoji(found);
        }

        throwSingleOrAggregate(problems, SeedcordErrorCode.ConfigEmojiUnresolved);

        this.logger.utils.summary('Loaded emojis', { emojis: Object.keys(emojiStorage).length });
    }

    private async inGuild(emoji: GuildExpected, fetchedGuilds: Set<string>): Promise<GuildEmoji | Error> {
        const guild = this.core.bot.client.guilds.cache.get(emoji.guildId);
        if (!guild) {
            return emojiUnreadable(
                emoji,
                "discord.js hasn't cached a guild with that id",
                'Check that the bot is in that guild, and that clientOptions.intents includes GatewayIntentBits.Guilds.'
            );
        }

        if (!fetchedGuilds.has(emoji.guildId)) {
            await guild.emojis.fetch();
            fetchedGuilds.add(emoji.guildId);
        }
        return guild.emojis.cache.find((cached) => cached.name === emoji.name) ?? emojiNotFound(emoji);
    }

    private inApplication(emoji: ApplicationExpected): ApplicationEmoji | Error {
        const cache = this.core.bot.client.application?.emojis.cache;
        return cache?.find((cached) => cached.name === emoji.name) ?? emojiNotFound(emoji);
    }

    private clearEmojis(): void {
        clearStore(emojiStorage);
    }
}
