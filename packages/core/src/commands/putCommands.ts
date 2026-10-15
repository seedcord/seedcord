import { RESTEvents } from '@discordjs/rest';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { unlessAborted } from '@seedcord/utils/internal';
import { Routes } from 'discord-api-types/v10';

import { indexById } from '#src/commands/linkCommands';

import type { DeployResult } from '#src/commands/types';
import type { RateLimitData, REST } from '@discordjs/rest';
import type { ILogger } from '@seedcord/types';
import type { APIApplicationCommand, RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

export type CommandBody = RESTPostAPIApplicationCommandsJSONBody;

export interface CommandScopes {
    readonly global: readonly CommandBody[];
    readonly guilds: ReadonlyMap<string, readonly CommandBody[]>;
}

export type DeployedScope = { readonly scope: 'global' } | { readonly scope: 'guild'; readonly guildId: string };

interface PutCommandsOptions {
    readonly rest: Pick<REST, 'put' | 'on' | 'off'>;
    readonly applicationId: string;
    readonly logger: Pick<ILogger, 'warn'>;
    readonly signal?: AbortSignal | undefined;
    readonly onDeployed?: (where: DeployedScope, commands: readonly CommandBody[]) => void;
}

const MS_PER_SECOND = 1000;

// discord replaces every command in a scope with the PUT body
export async function putCommands(scopes: CommandScopes, options: PutCommandsOptions): Promise<DeployResult> {
    const { applicationId, onDeployed } = options;
    const result: DeployResult = { global: new Map(), guilds: new Map() };

    if (scopes.global.length > 0) {
        result.global = indexById(await put(Routes.applicationCommands(applicationId), scopes.global, options));
        onDeployed?.({ scope: 'global' }, scopes.global);
    }

    for (const [guildId, commands] of scopes.guilds) {
        result.guilds.set(guildId, indexById(await putGuild(guildId, commands, options)));
        onDeployed?.({ scope: 'guild', guildId }, commands);
    }

    return result;
}

async function putGuild(
    guildId: string,
    commands: readonly CommandBody[],
    options: PutCommandsOptions
): Promise<APIApplicationCommand[]> {
    try {
        return await put(Routes.applicationGuildCommands(options.applicationId, guildId), commands, options);
    } catch (error) {
        throw new SeedcordError(SeedcordErrorCode.CoreCommandGuildDeployFailed, [guildId], { cause: error });
    }
}

async function put(
    route: `/${string}`,
    body: readonly CommandBody[],
    { rest, logger, signal }: PutCommandsOptions
): Promise<APIApplicationCommand[]> {
    const reportWait = (info: RateLimitData): void => {
        if (info.method !== 'PUT' || !info.url.endsWith(route)) return;
        const seconds = Math.ceil(info.timeToReset / MS_PER_SECOND);
        logger.warn(`Discord rate-limited the command deploy. It continues in ${paint.amber(`${seconds}s`)}.`);
    };

    rest.on(RESTEvents.RateLimited, reportWait);
    try {
        // @discordjs/rest checks the signal before it sends a request. Its rate-limit sleep ignores it
        // justified: the bulk-overwrite routes return the deployed command array
        return (await unlessAborted(rest.put(route, { body, signal }), signal)) as APIApplicationCommand[];
    } finally {
        rest.off(RESTEvents.RateLimited, reportWait);
    }
}
