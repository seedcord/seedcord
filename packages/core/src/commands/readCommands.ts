import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import { indexById } from '#src/commands/linkCommands';
import { commandsRoute, GLOBAL_ID } from '#src/commands/scopes';

import type { ScopeId } from '#src/commands/scopes';
import type { DeployResult } from '#src/commands/types';
import type { REST } from '@discordjs/rest';
import type { APIApplicationCommand, RESTGetAPIApplicationCommandsResult } from 'discord-api-types/v10';

interface ReadCommandsOptions {
    readonly rest: Pick<REST, 'get'>;
    readonly applicationId: string;
    readonly signal?: AbortSignal | undefined;
}

export async function readCommandsAt(
    scope: ScopeId,
    { rest, applicationId, signal }: ReadCommandsOptions
): Promise<Map<string, APIApplicationCommand>> {
    const route = commandsRoute(applicationId, scope);
    try {
        // justified: the discord api contract for both command list routes
        return indexById((await rest.get(route, { signal })) as RESTGetAPIApplicationCommandsResult);
    } catch (error) {
        if (signal?.aborted) throw error;
        const where = scope === GLOBAL_ID ? 'globally' : `to guild ${paint.sky(scope)}`;
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

export async function readCommands(scopes: Iterable<ScopeId>, options: ReadCommandsOptions): Promise<DeployResult> {
    const read = Iterator.from(scopes).map(async (scope) => [scope, await readCommandsAt(scope, options)] as const);
    return new Map(await Promise.all(read));
}
