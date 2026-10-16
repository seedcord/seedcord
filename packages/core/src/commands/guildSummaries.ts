import { Routes } from 'discord-api-types/v10';

import type { REST } from '@discordjs/rest';
import type { RESTGetAPIGuildResult } from 'discord-api-types/v10';

export interface GuildSummary {
    id: string;
    name: string;
}

type ReadRest = Pick<REST, 'get'>;

// the name is only a label. a guild the bot cannot read keeps its id as one
async function guildName(rest: ReadRest, guildId: string): Promise<string> {
    try {
        // justified: the discord api contract for the guild route
        return ((await rest.get(Routes.guild(guildId))) as RESTGetAPIGuildResult).name;
    } catch {
        return guildId;
    }
}

export function guildSummaries(
    rest: ReadRest,
    guildIds: Iterable<string>,
    knownNames: ReadonlyMap<string, string> = new Map()
): Promise<GuildSummary[]> {
    return Promise.all(
        Iterator.from(guildIds).map(async (id) => ({ id, name: knownNames.get(id) ?? (await guildName(rest, id)) }))
    );
}
