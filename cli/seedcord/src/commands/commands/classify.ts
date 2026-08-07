type CleanReason = 'overlap' | 'purge';

interface DeployedCommand {
    id: string;
    name: string;
}

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
                flagged.push({ guildId, guildName, id: command.id, name: command.name, reason: 'purge' });
            } else if (globalNames.has(command.name)) {
                flagged.push({ guildId, guildName, id: command.id, name: command.name, reason: 'overlap' });
            }
        }
    }

    return flagged;
}
