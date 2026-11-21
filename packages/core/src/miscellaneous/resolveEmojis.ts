import { SeedcordErrorCode } from '@seedcord/errors';
import { throwSingleOrAggregate, token } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';
import { Routes } from 'discord-api-types/v10';

import { emojiNotFound, emojiUnreadable } from '#src/miscellaneous/expectedEmojis';
import { accessorStore } from '#src/miscellaneous/guarded';
import { ResolvedEmoji } from '#src/miscellaneous/ResolvedEmoji';

import type { ExpectedEmoji } from '#src/miscellaneous/expectedEmojis';
import type { REST } from '@discordjs/rest';
import type { APIEmoji, RESTGetAPIApplicationEmojisResult, RESTGetAPIGuildEmojisResult } from 'discord-api-types/v10';

type EmojiRest = Pick<REST, 'get'>;

type EmojisByName = Map<string, APIEmoji>;

function byName(list: readonly APIEmoji[]): EmojisByName {
    const map: EmojisByName = new Map();
    for (const entry of list) if (entry.name) map.set(entry.name, entry);
    return map;
}

// app emojis come back as { items }, guild emojis as a plain array
export async function emojisAt(rest: EmojiRest, route: `/${string}`): Promise<APIEmoji[]> {
    // justified: the discord api contract for the two emoji list routes
    const listed = (await rest.get(route)) as RESTGetAPIApplicationEmojisResult | RESTGetAPIGuildEmojisResult;
    return Array.isArray(listed) ? listed : listed.items;
}

class EmojiResolver {
    private readonly resolved = accessorStore<ResolvedEmoji>();
    private readonly problems: Error[] = [];
    private readonly listsByRoute = new Map<string, EmojisByName | Error>();

    constructor(
        private readonly rest: EmojiRest,
        private readonly applicationId: string
    ) {}

    public async resolve(expected: readonly ExpectedEmoji[]): Promise<Record<string, ResolvedEmoji>> {
        for (const emoji of expected) await this.resolveOne(emoji);

        throwSingleOrAggregate(this.problems, SeedcordErrorCode.ConfigEmojiUnresolved);
        return this.resolved;
    }

    private async resolveOne(emoji: ExpectedEmoji): Promise<void> {
        const list = await this.listFor(emoji);
        if (Error.isError(list)) {
            const fix =
                emoji.kind === 'guild'
                    ? 'Check that the bot is in that guild.'
                    : `Check that ${token()} is still valid.`;
            this.problems.push(emojiUnreadable(emoji, list.message, fix, list));
            return;
        }

        const found = list.get(emoji.name);
        if (!found?.id) {
            this.problems.push(emojiNotFound(emoji));
            return;
        }
        this.resolved[emoji.key] = new ResolvedEmoji(emoji.name, found.id, found.animated ?? false);
    }

    private async listFor(emoji: ExpectedEmoji): Promise<EmojisByName | Error> {
        const route =
            emoji.kind === 'guild' ? Routes.guildEmojis(emoji.guildId) : Routes.applicationEmojis(this.applicationId);
        let list = this.listsByRoute.get(route);
        if (!list) {
            list = await this.read(route);
            this.listsByRoute.set(route, list);
        }
        return list;
    }

    private async read(route: `/${string}`): Promise<EmojisByName | Error> {
        try {
            return byName(await emojisAt(this.rest, route));
        } catch (error) {
            return asError(error);
        }
    }
}

export function resolveEmojis(
    rest: EmojiRest,
    applicationId: string,
    expected: readonly ExpectedEmoji[]
): Promise<Record<string, ResolvedEmoji>> {
    return new EmojiResolver(rest, applicationId).resolve(expected);
}
