import { applicationOf } from '#core/discord/applicationOf';
import { guildSummaries } from '#core/discord/guildSummaries';
import { readDeployed } from '#core/discord/readDeployed';

import type { REST } from '@discordjs/rest';
import type { DeployResult } from '@seedcord/core/internal';

export interface DiscordState {
    applicationId: string;
    deployed: DeployResult;
    guildNames: Map<string, string>;
}

// every guild must read, since a deploy replaces each one
export async function readDiscordState(rest: Pick<REST, 'get'>, guildIds: readonly string[]): Promise<DiscordState> {
    const { id } = await applicationOf(rest);
    const [deployed, guilds] = await Promise.all([readDeployed(rest, id, guildIds), guildSummaries(rest, guildIds)]);
    return { applicationId: id, deployed, guildNames: new Map(guilds.map((guild) => [guild.id, guild.name])) };
}
