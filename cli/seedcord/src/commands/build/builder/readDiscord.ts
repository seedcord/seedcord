import { linkCommands, resolveDeployTarget, resolveEmojis } from '@seedcord/core/internal';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';
import { ApplicationCommandType, Routes } from 'discord-api-types/v10';

import type { FoundCommand } from '#core/modules/CommandScanner';
import type { REST, RouteLike } from '@discordjs/rest';
import type { BakedIds, CommandRef, DeployResult, LinkedCommands } from '@seedcord/core/internal';
import type {
    APIApplicationCommand,
    RESTGetAPIApplicationCommandsResult,
    RESTGetCurrentApplicationResult
} from 'discord-api-types/v10';

export interface CommandsInCode {
    found: readonly FoundCommand[];
    // the bot config's commands.guilds
    guilds: readonly string[];
}

interface DiscordReadOptions {
    rest: Pick<REST, 'get'>;
    // undefined when the bot sets no commands folder
    commands: CommandsInCode | undefined;
    emojis: Readonly<Record<string, unknown>> | undefined;
}

export interface DiscordRead extends Pick<LinkedCommands, 'notInCode' | 'multiGuild'> {
    ids: BakedIds;
}

const NO_COMMANDS: LinkedCommands = {
    commands: {},
    contextMenus: { user: {}, message: {} },
    notDeployed: [],
    multiGuild: [],
    notInCode: []
};

function byId(commands: readonly APIApplicationCommand[]): Map<string, APIApplicationCommand> {
    return new Map(commands.map((command) => [command.id, command]));
}

class DiscordReader {
    constructor(
        private readonly rest: Pick<REST, 'get'>,
        private readonly applicationId: string
    ) {}

    public async link({ found, guilds }: CommandsInCode): Promise<LinkedCommands> {
        const deployed = await this.deployed(targetGuilds(found, guilds));
        const linked = linkCommands(
            deployed,
            found.map((command) => command.json)
        );
        assertDeployed(found, linked.notDeployed);
        return linked;
    }

    private async deployed(guildIds: ReadonlySet<string>): Promise<DeployResult> {
        const [global, ...guilds] = await Promise.all([
            this.globalCommands(),
            ...[...guildIds].map(async (guildId) => [guildId, await this.guildCommands(guildId)] as const)
        ]);
        return { global, guilds: new Map(guilds) };
    }

    private globalCommands(): Promise<Map<string, APIApplicationCommand>> {
        return this.commandsAt(Routes.applicationCommands(this.applicationId), 'globally');
    }

    private guildCommands(guildId: string): Promise<Map<string, APIApplicationCommand>> {
        const route = Routes.applicationGuildCommands(this.applicationId, guildId);
        return this.commandsAt(route, `to guild ${paint.sky(guildId)}`);
    }

    private async commandsAt(route: RouteLike, where: string): Promise<Map<string, APIApplicationCommand>> {
        try {
            // justified: the discord api contract for both command list routes
            return byId((await this.rest.get(route)) as RESTGetAPIApplicationCommandsResult);
        } catch (error: unknown) {
            throw new SeedcordError(SeedcordErrorCode.CliEdgeCommandsUnreadable, [where, asError(error).message], {
                cause: error
            });
        }
    }
}

function targetGuilds(commands: readonly FoundCommand[], configured: readonly string[]): Set<string> {
    const guilds = new Set<string>();
    for (const { meta, json } of commands) {
        const target = resolveDeployTarget(meta, configured, json.name);
        if (target.scope === 'guild') for (const guildId of target.guilds) guilds.add(guildId);
    }
    return guilds;
}

function sourceFileOf(commands: readonly FoundCommand[], { name, type }: CommandRef): string | undefined {
    return commands.find(({ json }) => json.name === name && (json.type ?? ApplicationCommandType.ChatInput) === type)
        ?.sourceFile;
}

function assertDeployed(commands: readonly FoundCommand[], notDeployed: readonly CommandRef[]): void {
    if (notDeployed.length === 0) return;
    const lines = notDeployed.map((ref) => {
        const file = sourceFileOf(commands, ref);
        return `  - ${paint.sky(ref.name)}${file ? ` in ${paint.path(file)}` : ''}`;
    });
    throw new SeedcordError(SeedcordErrorCode.CliEdgeCommandsNotDeployed, [notDeployed.length, lines.join('\n')]);
}

async function applicationOf(rest: Pick<REST, 'get'>): Promise<RESTGetCurrentApplicationResult> {
    try {
        // justified: the discord api contract for this route
        return (await rest.get(Routes.currentApplication())) as RESTGetCurrentApplicationResult;
    } catch (error: unknown) {
        throw new SeedcordError(SeedcordErrorCode.CliEdgeApplicationUnreadable, [asError(error).message], {
            cause: error
        });
    }
}

export async function readDiscord({ rest, commands, emojis }: DiscordReadOptions): Promise<DiscordRead> {
    const application = await applicationOf(rest);
    const reader = new DiscordReader(rest, application.id);
    const [linked, resolvedEmojis] = await Promise.all([
        commands ? reader.link(commands) : NO_COMMANDS,
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
