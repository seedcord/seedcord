import { ContextMenuCommandBuilder } from '@discordjs/builders';
import { ApplicationCommandType } from 'discord-api-types/v10';

import type { SlashCommandBuilder } from '@discordjs/builders';

/** @internal */
export interface ContextMenuLeaves {
    readonly user: Set<string>;
    readonly message: Set<string>;
}

/**
 * dedupes names across builders, since the same builder repeats once per guild.
 * a user and a message command can share a name.
 *
 * @internal
 */
export function contextMenuLeaves(
    commands: Iterable<SlashCommandBuilder | ContextMenuCommandBuilder>
): ContextMenuLeaves {
    const user = new Set<string>();
    const message = new Set<string>();
    for (const command of commands) {
        if (!(command instanceof ContextMenuCommandBuilder)) continue;
        if (command.type === ApplicationCommandType.User) user.add(command.name);
        else message.add(command.name);
    }
    return { user, message };
}
