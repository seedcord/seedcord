import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';
import { Routes } from 'discord-api-types/v10';

import { indexById } from '#src/commands/linkCommands';

import type { DeployResult } from '#src/commands/types';
import type { REST } from '@discordjs/rest';
import type { APIApplicationCommand, RESTGetAPIApplicationCommandsResult } from 'discord-api-types/v10';

interface ReadCommandsOptions {
    readonly rest: Pick<REST, 'get'>;
    readonly applicationId: string;
    readonly signal?: AbortSignal | undefined;
}

interface ScopesToRead {
    readonly global: boolean;
    readonly guildIds: Iterable<string>;
}

// a guild id reads that guild's commands, undefined reads the global ones
export async function readCommandsAt(
    guildId: string | undefined,
    { rest, applicationId, signal }: ReadCommandsOptions
): Promise<Map<string, APIApplicationCommand>> {
    const route = guildId
        ? Routes.applicationGuildCommands(applicationId, guildId)
        : Routes.applicationCommands(applicationId);
    try {
        // justified: the discord api contract for both command list routes
        return indexById((await rest.get(route, { signal })) as RESTGetAPIApplicationCommandsResult);
    } catch (error) {
        if (signal?.aborted) throw error;
        const where = guildId ? `to guild ${paint.sky(guildId)}` : 'globally';
        throw new SeedcordError(
            SeedcordErrorCode.CoreDiscordReadFailed,
            [
                `the commands deployed ${where}`,
                asError(error).message,
                `Check ${paint.bold('DISCORD_BOT_TOKEN')}. For a guild, also check that the bot is in it.`
            ],
            { cause: error }
        );
    }
}

export async function readCommands(
    { global, guildIds }: ScopesToRead,
    options: ReadCommandsOptions
): Promise<DeployResult> {
    const [globalCommands, ...guilds] = await Promise.all([
        global ? readCommandsAt(undefined, options) : new Map<string, APIApplicationCommand>(),
        ...Iterator.from(guildIds).map(async (guildId) => [guildId, await readCommandsAt(guildId, options)] as const)
    ]);
    return { global: globalCommands, guilds: new Map(guilds) };
}
