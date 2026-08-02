import { accessorStore, clearStore, guardedAccessor } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { Routes } from 'discord-api-types/v10';

import type { Core } from '@interfaces/Core';
import type { EmojiMap } from '@seedcord/types';
import type { APIApplication, APIEmoji, APIMessageComponentEmoji } from 'discord-api-types/v10';

/** A resolved emoji. Renders as `<:name:id>` in message content and passes every component builder. */
export interface ResolvedEmoji extends APIMessageComponentEmoji {
    readonly id: string;
    readonly name: string;
    readonly animated: boolean;
    toString(): string;
}

// a class keeps toString off the own keys. setEmoji validates with a strict object strategy and
// rejects any own enumerable key beyond the three wire fields.
class Emoji implements ResolvedEmoji {
    constructor(
        public readonly name: string,
        public readonly id: string,
        public readonly animated = false
    ) {}

    public toString(): string {
        return `<${this.animated ? 'a' : ''}:${this.name}:${this.id}>`;
    }
}

const emojiStorage = accessorStore<ResolvedEmoji>();

function isEmojiTuple(v: unknown): v is readonly [string, string] {
    return Array.isArray(v) && v.length === 2 && typeof v[0] === 'string' && typeof v[1] === 'string';
}

function byName(list: readonly APIEmoji[]): Map<string, APIEmoji> {
    const map = new Map<string, APIEmoji>();
    for (const entry of list) if (entry.name) map.set(entry.name, entry);
    return map;
}

/** The global {@link Emojis} accessor type. Each key resolves to a {@link ResolvedEmoji}. */
export type InjectedEmojiMap = {
    [K in keyof EmojiMap]: ResolvedEmoji;
};

/**
 * The bot's resolved emojis, keyed by {@link EmojiMap}. Filled by {@link EmojiInjector} during startup.
 * A read before that throws.
 */
export const Emojis = guardedAccessor('Emojis', emojiStorage) as InjectedEmojiMap;

/**
 * Resolves the configured emojis over REST at startup.
 *
 * @internal
 */
export class EmojiInjector {
    private readonly logger = new Logger('Emojis', { channel: 'bot' });

    constructor(private readonly core: Core) {}

    public async init(): Promise<void> {
        clearStore(emojiStorage);

        const configured = this.core.config.bot.emojis;
        if (!configured || Object.keys(configured).length === 0) {
            this.logger.debug('No emojis configured, skipping emoji injection.');
            return;
        }

        const failures: string[] = [];
        const application = byName(await this.applicationEmojis());
        const guilds = new Map<string, Map<string, APIEmoji>>();

        for (const [key, value] of Object.entries(configured)) {
            if (isEmojiTuple(value)) await this.resolveTuple(key, value, guilds, failures);
            else if (typeof value === 'string') this.resolve(key, value, application, failures, 'the application');
            else failures.push(`  - "${key}" has an invalid value (expected a name or [name, guildId])`);
        }

        // surface every unresolved emoji at once so the user fixes the whole config in one pass
        if (failures.length > 0) {
            throw new SeedcordError(SeedcordErrorCode.ConfigEmojiUnresolved, [failures.length, failures.join('\n')]);
        }

        this.logger.utils.summary('Loaded emojis', { emojis: Object.keys(emojiStorage).length });
    }

    private async applicationEmojis(): Promise<APIEmoji[]> {
        const application = (await this.core.rest.get(Routes.currentApplication())) as APIApplication;
        const listed = (await this.core.rest.get(Routes.applicationEmojis(application.id))) as { items: APIEmoji[] };
        return listed.items;
    }

    private async resolveTuple(
        key: string,
        [name, guildId]: readonly [string, string],
        guilds: Map<string, Map<string, APIEmoji>>,
        failures: string[]
    ): Promise<void> {
        let guild = guilds.get(guildId);
        if (!guild) {
            try {
                guild = byName((await this.core.rest.get(Routes.guildEmojis(guildId))) as APIEmoji[]);
            } catch {
                failures.push(`  - "${name}" for "${key}" targets guild ${guildId}, which could not be read`);
                return;
            }
            guilds.set(guildId, guild);
        }

        this.resolve(key, name, guild, failures, `guild ${guildId}`);
    }

    private resolve(key: string, name: string, source: Map<string, APIEmoji>, failures: string[], where: string): void {
        const found = source.get(name);
        if (!found?.id) {
            failures.push(`  - "${name}" for "${key}" was not found in ${where}`);
            return;
        }

        emojiStorage[key] = new Emoji(name, found.id, found.animated ?? false);
    }
}
