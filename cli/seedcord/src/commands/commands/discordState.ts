import { Routes } from 'discord-api-types/v10';

import { applicationOf } from '#core/discord/applicationOf';
import { readDeployed } from '#core/discord/readDeployed';

import type { REST } from '@discordjs/rest';
import type { DeployResult } from '@seedcord/core/internal';
import type { RESTGetAPIGuildResult } from 'discord-api-types/v10';

type ReadRest = Pick<REST, 'get'>;

export interface DiscordState<Rest extends ReadRest> {
    rest: Rest;
    applicationId: string;
    deployed: DeployResult;
    guildNames: Map<string, string>;
}

// readDeployed reports a guild the bot cannot reach. the name is only a label
async function guildName(rest: ReadRest, guildId: string): Promise<string> {
    try {
        // justified: the discord api contract for the guild route
        return ((await rest.get(Routes.guild(guildId))) as RESTGetAPIGuildResult).name;
    } catch {
        return guildId;
    }
}

export async function readDiscordState<Rest extends ReadRest>(
    rest: Rest,
    guildIds: readonly string[]
): Promise<DiscordState<Rest>> {
    const { id } = await applicationOf(rest);
    const [deployed, names] = await Promise.all([
        readDeployed(rest, id, guildIds),
        Promise.all(guildIds.map(async (guildId) => [guildId, await guildName(rest, guildId)] as const))
    ]);
    return { rest, applicationId: id, deployed, guildNames: new Map(names) };
}
