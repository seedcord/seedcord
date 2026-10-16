import { RESTEvents } from '@discordjs/rest';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { unlessAborted } from '@seedcord/utils/internal';

import { indexById } from '#src/commands/linkCommands';
import { commandsRoute, GLOBAL_ID, globalFirst } from '#src/commands/scopes';

import type { ScopeId, ScopeMap } from '#src/commands/scopes';
import type { DeployResult } from '#src/commands/types';
import type { RateLimitData, REST } from '@discordjs/rest';
import type { ILogger } from '@seedcord/types';
import type { APIApplicationCommand, RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

export type CommandBody = RESTPostAPIApplicationCommandsJSONBody;

// a scope left out keeps what discord has. an empty list clears it
export type CommandScopes = ScopeMap<readonly CommandBody[]>;

interface PutCommandsOptions {
    readonly rest: Pick<REST, 'put' | 'on' | 'off'>;
    readonly applicationId: string;
    readonly logger: Pick<ILogger, 'warn'>;
    readonly signal?: AbortSignal | undefined;
    readonly onDeployed?: (scope: ScopeId, commands: readonly CommandBody[]) => void;
}

const MS_PER_SECOND = 1000;

// discord replaces every command in a scope with the PUT body
export async function putCommands(scopes: CommandScopes, options: PutCommandsOptions): Promise<DeployResult> {
    const result: DeployResult = new Map();
    for (const [scope, commands] of globalFirst(scopes)) {
        result.set(scope, indexById(await putScope(scope, commands, options)));
        options.onDeployed?.(scope, commands);
    }
    return result;
}

async function putScope(
    scope: ScopeId,
    commands: readonly CommandBody[],
    options: PutCommandsOptions
): Promise<APIApplicationCommand[]> {
    try {
        return await put(commandsRoute(options.applicationId, scope), commands, options);
    } catch (error) {
        if (options.signal?.aborted) throw error;
        throw scope === GLOBAL_ID
            ? new SeedcordError(SeedcordErrorCode.CoreCommandGlobalDeployFailed, { cause: error })
            : new SeedcordError(SeedcordErrorCode.CoreCommandGuildDeployFailed, [scope], { cause: error });
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
