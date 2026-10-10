import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';
import { Routes } from 'discord-api-types/v10';

import { isEmojiTuple } from '#src/miscellaneous/emojiConfig';
import { accessorStore } from '#src/miscellaneous/guarded';
import { ResolvedEmoji } from '#src/miscellaneous/ResolvedEmoji';

import type { REST } from '@discordjs/rest';
import type { APIEmoji, RESTGetAPIApplicationEmojisResult, RESTGetAPIGuildEmojisResult } from 'discord-api-types/v10';

type EmojiRest = Pick<REST, 'get'>;

type EmojisByName = Map<string, APIEmoji>;

function byName(list: readonly APIEmoji[]): EmojisByName {
    const map: EmojisByName = new Map();
    for (const entry of list) if (entry.name) map.set(entry.name, entry);
    return map;
}

class EmojiResolver {
    private readonly resolved = accessorStore<ResolvedEmoji>();
    private readonly failures: string[] = [];
    private readonly guilds = new Map<string, EmojisByName | Error>();
    private application?: EmojisByName | Error;

    constructor(
        private readonly rest: EmojiRest,
        private readonly applicationId: string
    ) {}

    public async resolve(configured: Readonly<Record<string, unknown>>): Promise<Record<string, ResolvedEmoji>> {
        for (const [key, value] of Object.entries(configured)) {
            if (isEmojiTuple(value)) await this.fromGuild(key, value);
            else if (typeof value === 'string') await this.fromApplication(key, value);
            else this.failures.push(`  - "${key}" has an invalid value (expected a name or [name, guildId])`);
        }

        if (this.failures.length > 0) {
            throw new SeedcordError(SeedcordErrorCode.ConfigEmojiUnresolved, [
                this.failures.length,
                this.failures.join('\n')
            ]);
        }
        return this.resolved;
    }

    private async fromApplication(key: string, name: string): Promise<void> {
        this.application ??= await this.applicationEmojis();

        if (Error.isError(this.application)) {
            this.failures.push(
                `  - "${name}" for "${key}" is an application emoji, and those could not be read (${this.application.message})`
            );
            return;
        }
        this.pick(key, name, this.application, 'the application');
    }

    private async applicationEmojis(): Promise<EmojisByName | Error> {
        try {
            // justified: the discord api contract for this route
            const listed = (await this.rest.get(
                Routes.applicationEmojis(this.applicationId)
            )) as RESTGetAPIApplicationEmojisResult;
            return byName(listed.items);
        } catch (error) {
            return asError(error);
        }
    }

    private async fromGuild(key: string, [name, guildId]: readonly [string, string]): Promise<void> {
        let guild = this.guilds.get(guildId);
        if (!guild) {
            guild = await this.guildEmojis(guildId);
            this.guilds.set(guildId, guild);
        }

        if (Error.isError(guild)) {
            this.failures.push(
                `  - "${name}" for "${key}" targets guild ${guildId}, which could not be read (${guild.message})`
            );
            return;
        }
        this.pick(key, name, guild, `guild ${guildId}`);
    }

    private async guildEmojis(guildId: string): Promise<EmojisByName | Error> {
        try {
            // justified: the discord api contract for this route
            return byName((await this.rest.get(Routes.guildEmojis(guildId))) as RESTGetAPIGuildEmojisResult);
        } catch (error) {
            return asError(error);
        }
    }

    private pick(key: string, name: string, source: EmojisByName, where: string): void {
        const found = source.get(name);
        if (!found?.id) {
            this.failures.push(`  - "${name}" for "${key}" was not found in ${where}`);
            return;
        }
        this.resolved[key] = new ResolvedEmoji(name, found.id, found.animated ?? false);
    }
}

// tries every configured emoji, then throws ConfigEmojiUnresolved listing each one that failed
export function resolveEmojis(
    rest: EmojiRest,
    applicationId: string,
    configured: Readonly<Record<string, unknown>>
): Promise<Record<string, ResolvedEmoji>> {
    return new EmojiResolver(rest, applicationId).resolve(configured);
}
