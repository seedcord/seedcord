export type CleanReason = 'overlap' | 'purge';

export interface DeployedCommand {
    id: string;
    name: string;
}

export interface GuildCommands {
    guildId: string;
    commands: DeployedCommand[];
}

export interface Flagged extends DeployedCommand {
    guildId: string;
    reason: CleanReason;
}

/**
 * Selects which deployed guild commands `commands --clean` would delete. Under `purge`, every command in the
 * named guilds. Otherwise only `overlap` commands, a guild command whose name also exists globally and so
 * renders twice in the picker. Global commands are never passed in here, so they are never deleted.
 */
export function classifyGuildCommands(
    globalNames: ReadonlySet<string>,
    guilds: readonly GuildCommands[],
    purge: boolean
): Flagged[] {
    const flagged: Flagged[] = [];

    for (const { guildId, commands } of guilds) {
        for (const command of commands) {
            if (purge) {
                flagged.push({ guildId, id: command.id, name: command.name, reason: 'purge' });
            } else if (globalNames.has(command.name)) {
                flagged.push({ guildId, id: command.id, name: command.name, reason: 'overlap' });
            }
        }
    }

    return flagged;
}
