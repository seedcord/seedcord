import { ContextMenuCommandBuilder } from '@discordjs/builders';
import { ApplicationCommandType } from 'discord-api-types/v10';

import type { SlashCommandBuilder } from '@discordjs/builders';

/** The registered context-menu command names, split by kind. @internal */
export interface ContextMenuLeaves {
    readonly user: Set<string>;
    readonly message: Set<string>;
}

/**
 * Collects the names of every registered context-menu command across a set of command builders, deduplicated
 * because the same builder appears once per guild. A user and a message command can share a name, so the two
 * kinds stay in separate sets.
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
