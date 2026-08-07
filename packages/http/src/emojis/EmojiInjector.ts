import { accessorStore, clearStore, guardedAccessor, isEmojiTuple } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { Routes } from 'discord-api-types/v10';

import { fetchApplicationId } from '@src/applicationId';

import type { Core } from '@interfaces/Core';
import type { EmojiMap } from '@seedcord/types';
import type { APIEmoji, APIMessageComponentEmoji } from 'discord-api-types/v10';

/** A resolved emoji. Renders as `<:name:id>` in message content, or `<a:name:id>` when animated. */
export interface ResolvedEmoji extends APIMessageComponentEmoji {
    readonly id: string;
    readonly name: string;
    readonly animated: boolean;
    toString(): string;
}

// a class keeps toString off the own keys, which setEmoji rejects past the three wire fields
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

function reasonOf(error: unknown): string {
    return Error.isError(error) ? error.message : String(error);
}

function byName(list: readonly APIEmoji[]): Map<string, APIEmoji> {
    const map = new Map<string, APIEmoji>();
    for (const entry of list) if (entry.name) map.set(entry.name, entry);
    return map;
}

/** The global {@link Emojis} accessor type. */
export type InjectedEmojiMap = {
    [K in keyof EmojiMap]: ResolvedEmoji;
};

/**
 * The bot's resolved emojis, keyed by {@link EmojiMap}. Filled by {@link EmojiInjector} during startup.
 * A read before that throws.
 */
export const Emojis = guardedAccessor('Emojis', emojiStorage) as InjectedEmojiMap;

// resolves the configured emojis over REST at startup
export class EmojiInjector {
    private readonly logger = new Logger('Emojis', { channel: 'bot' });

    constructor(
        private readonly core: Core,
        // the host passes its memoized one so a boot that also deploys commands resolves the id once
        private readonly applicationId: () => Promise<string> = () => fetchApplicationId(core.rest)
    ) {}

    public async init(): Promise<void> {
        clearStore(emojiStorage);

        const configured = this.core.config.bot.emojis;
        if (!configured || Object.keys(configured).length === 0) {
            this.logger.debug('No emojis configured, skipping emoji injection.');
            return;
        }

        const failures: string[] = [];
        const guilds = new Map<string, Map<string, APIEmoji>>();
        let application: Map<string, APIEmoji> | undefined;

        for (const [key, value] of Object.entries(configured)) {
            if (isEmojiTuple(value)) await this.resolveTuple(key, value, guilds, failures);
            else if (typeof value === 'string') {
                application ??= await this.applicationEmojis(failures);
                this.resolve(key, value, application, failures, 'the application');
            } else failures.push(`  - "${key}" has an invalid value (expected a name or [name, guildId])`);
        }

        // surface every unresolved emoji at once so the user fixes the whole config in one pass
        if (failures.length > 0) {
            throw new SeedcordError(SeedcordErrorCode.ConfigEmojiUnresolved, [failures.length, failures.join('\n')]);
        }

        this.logger.utils.summary('Loaded emojis', { emojis: Object.keys(emojiStorage).length });
    }

    private async applicationEmojis(failures: string[]): Promise<Map<string, APIEmoji>> {
        try {
            const appId = await this.applicationId();
            // justified: the discord api contract for this route
            const listed = (await this.core.rest.get(Routes.applicationEmojis(appId))) as {
                items: APIEmoji[];
            };
            return byName(listed.items);
        } catch (error) {
            failures.push(`  - the application emojis could not be read (${reasonOf(error)})`);
            return new Map();
        }
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
                // justified: the discord api contract for this route
                guild = byName((await this.core.rest.get(Routes.guildEmojis(guildId))) as APIEmoji[]);
            } catch (error) {
                failures.push(
                    `  - "${name}" for "${key}" targets guild ${guildId}, which could not be read (${reasonOf(error)})`
                );
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
