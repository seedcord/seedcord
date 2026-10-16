import { indexById } from '@seedcord/core/internal';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';
import { Routes } from 'discord-api-types/v10';

import type { REST, RouteLike } from '@discordjs/rest';
import type { DeployResult } from '@seedcord/core/internal';
import type { APIApplicationCommand, RESTGetAPIApplicationCommandsResult } from 'discord-api-types/v10';

type Rest = Pick<REST, 'get'>;

async function commandsAt(rest: Rest, route: RouteLike, where: string): Promise<Map<string, APIApplicationCommand>> {
    try {
        // justified: the discord api contract for both command list routes
        return indexById((await rest.get(route)) as RESTGetAPIApplicationCommandsResult);
    } catch (error: unknown) {
        throw new SeedcordError(SeedcordErrorCode.CliCommandsUnreadable, [where, asError(error).message], {
            cause: error
        });
    }
}

export function readGlobalCommands(rest: Rest, applicationId: string): Promise<Map<string, APIApplicationCommand>> {
    return commandsAt(rest, Routes.applicationCommands(applicationId), 'globally');
}

export function readGuildCommands(
    rest: Rest,
    applicationId: string,
    guildId: string
): Promise<Map<string, APIApplicationCommand>> {
    const route = Routes.applicationGuildCommands(applicationId, guildId);
    return commandsAt(rest, route, `to guild ${paint.sky(guildId)}`);
}

async function guildEntry(
    rest: Rest,
    applicationId: string,
    guildId: string
): Promise<[string, Map<string, APIApplicationCommand>]> {
    return [guildId, await readGuildCommands(rest, applicationId, guildId)];
}

export async function readDeployed(
    rest: Rest,
    applicationId: string,
    guildIds: Iterable<string>
): Promise<DeployResult> {
    const [global, ...guilds] = await Promise.all([
        readGlobalCommands(rest, applicationId),
        ...Iterator.from(guildIds).map((guildId) => guildEntry(rest, applicationId, guildId))
    ]);
    return { global, guilds: new Map(guilds) };
}
