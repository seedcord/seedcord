import {
    commandRefOf,
    GLOBAL_ID,
    linkCommands,
    readCommands,
    resolveDeployTarget,
    resolveEmojis,
    scopeIdsOf
} from '@seedcord/core/internal';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { scopesInCode } from '#commands/commands/codeScopes';
import { applicationOf } from '#core/discord/applicationOf';

import type { FoundCommand } from '#core/modules/CommandScanner';
import type { REST } from '@discordjs/rest';
import type { BakedIds, DeployResult, LinkedCommands } from '@seedcord/core/internal';

export interface CommandsInCode {
    found: readonly FoundCommand[];
    configuredGuilds: readonly string[];
}

type DeployTarget = ReturnType<typeof resolveDeployTarget>;

interface TargetedCommand {
    command: FoundCommand;
    target: DeployTarget;
}

interface DiscordReadOptions {
    rest: Pick<REST, 'get'>;
    // undefined when the bot config's commands.path is null
    commands: CommandsInCode | undefined;
    emojis: Readonly<Record<string, unknown>> | undefined;
}

interface DiscordRead extends Pick<LinkedCommands, 'notInCode' | 'multiGuild'> {
    ids: BakedIds;
}

const NO_COMMANDS: LinkedCommands = {
    commands: {},
    contextMenus: { user: {}, message: {} },
    multiGuild: [],
    notInCode: []
};

async function linkDeployed(
    rest: Pick<REST, 'get'>,
    applicationId: string,
    { found, configuredGuilds }: CommandsInCode
): Promise<LinkedCommands> {
    const targeted = found.map((command) => ({
        command,
        target: resolveDeployTarget(command.meta, configuredGuilds, command.className)
    }));
    // notInCode reports stray global commands too
    const scopes = new Set([GLOBAL_ID, ...scopesInCode(found, configuredGuilds).keys()]);
    const deployed = await readCommands(scopes, { rest, applicationId });
    assertDeployed(targeted.filter(({ command, target }) => !isDeployedTo(deployed, command, target)));
    return linkCommands(
        deployed,
        found.map((command) => command.json)
    );
}

function isDeployedTo(deployed: DeployResult, { json }: FoundCommand, target: DeployTarget): boolean {
    const { name, type } = commandRefOf(json);
    return scopeIdsOf(target).every((scope) =>
        [...(deployed.get(scope)?.values() ?? [])].some((c) => c.name === name && c.type === type)
    );
}

function assertDeployed(notDeployed: readonly TargetedCommand[]): void {
    if (notDeployed.length === 0) return;
    const lines = notDeployed.map(
        ({ command }) => `  - ${paint.sky(command.json.name)} in ${paint.path(command.sourceFile)}`
    );
    throw new SeedcordError(SeedcordErrorCode.CliEdgeCommandsNotDeployed, [lines]);
}

export async function readDiscord({ rest, commands, emojis }: DiscordReadOptions): Promise<DiscordRead> {
    const application = await applicationOf(rest);
    const [linked, resolvedEmojis] = await Promise.all([
        commands ? linkDeployed(rest, application.id, commands) : NO_COMMANDS,
        emojis ? resolveEmojis(rest, application.id, emojis) : {}
    ]);

    return {
        ids: {
            publicKey: application.verify_key,
            emojis: resolvedEmojis,
            commands: linked.commands,
            contextMenus: linked.contextMenus
        },
        notInCode: linked.notInCode,
        multiGuild: linked.multiGuild
    };
}
