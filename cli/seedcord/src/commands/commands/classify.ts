import type { APIApplicationCommand } from 'discord-api-types/v10';

type CleanReason = 'overlap' | 'purge';

type DeployedCommand = Pick<APIApplicationCommand, 'id' | 'name' | 'type'>;

export interface GuildCommands {
    guildId: string;
    guildName: string;
    commands: DeployedCommand[];
}

export interface Flagged extends DeployedCommand {
    guildId: string;
    guildName: string;
    reason: CleanReason;
}

/**
 * Selects which deployed guild commands `commands --clean` would delete. An overlap is a guild command
 * whose name also exists globally, so it renders twice in the picker.
 */
export function classifyGuildCommands(
    globalNames: ReadonlySet<string>,
    guilds: readonly GuildCommands[],
    purge: boolean
): Flagged[] {
    const flagged: Flagged[] = [];

    for (const { guildId, guildName, commands } of guilds) {
        for (const command of commands) {
            if (purge) {
                flagged.push({ ...command, guildId, guildName, reason: 'purge' });
            } else if (globalNames.has(command.name)) {
                flagged.push({ ...command, guildId, guildName, reason: 'overlap' });
            }
        }
    }

    return flagged;
}
