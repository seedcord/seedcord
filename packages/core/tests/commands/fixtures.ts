import { ContextMenuCommandBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { ApplicationCommandType } from 'discord-api-types/v10';

import { GLOBAL_ID } from '#src/commands/scopes';

import type { DeployResult } from '#src/commands/types';
import type {
    APIApplicationCommand,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    RESTPostAPIContextMenuApplicationCommandsJSONBody
} from 'discord-api-types/v10';

type DeployedEntry = [id: string, name: string, type?: ApplicationCommandType];

export function deployed(entries: DeployedEntry[]): Map<string, APIApplicationCommand> {
    const built = new Map<string, APIApplicationCommand>();
    // justified: only the id, name, and type are read downstream
    for (const [id, name, type = ApplicationCommandType.ChatInput] of entries)
        built.set(id, { id, name, type } as APIApplicationCommand);
    return built;
}

export function deploy(global: Map<string, APIApplicationCommand>, guilds: DeployResult = new Map()): DeployResult {
    return new Map([[GLOBAL_ID, global], ...guilds]);
}

export function guildBucket(
    guildId: string,
    entries: DeployedEntry[]
): Map<string, Map<string, APIApplicationCommand>> {
    const guilds = new Map<string, Map<string, APIApplicationCommand>>();
    guilds.set(guildId, deployed(entries));
    return guilds;
}

export function ping(): RESTPostAPIChatInputApplicationCommandsJSONBody {
    return new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!').toJSON();
}

export function grouped(): RESTPostAPIChatInputApplicationCommandsJSONBody {
    return new SlashCommandBuilder()
        .setName('mod')
        .setDescription('moderation')
        .addSubcommandGroup((group) =>
            group
                .setName('case')
                .setDescription('cases')
                .addSubcommand((sub) => sub.setName('close').setDescription('close a case'))
        )
        .toJSON();
}

export function withSubcommand(): RESTPostAPIChatInputApplicationCommandsJSONBody {
    return new SlashCommandBuilder()
        .setName('ban')
        .setDescription('ban')
        .addSubcommand((sub) => sub.setName('list').setDescription('list bans'))
        .toJSON();
}

export function userMenu(name = 'View Profile'): RESTPostAPIContextMenuApplicationCommandsJSONBody {
    return new ContextMenuCommandBuilder().setName(name).setType(ApplicationCommandType.User).toJSON();
}

export function messageMenu(name = 'Report Message'): RESTPostAPIContextMenuApplicationCommandsJSONBody {
    return new ContextMenuCommandBuilder().setName(name).setType(ApplicationCommandType.Message).toJSON();
}
