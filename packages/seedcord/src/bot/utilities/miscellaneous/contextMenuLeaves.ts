import { ApplicationCommandType, ContextMenuCommandBuilder } from 'discord.js';

import type { SlashCommandBuilder } from 'discord.js';

/** The registered context-menu command names, split by kind, deduplicated. @internal */
export interface ContextMenuLeaves {
    readonly user: Set<string>;
    readonly message: Set<string>;
}

/**
 * Collects the names of every registered context-menu command across a set of command builders, split into a
 * user set and a message set. The same builder may appear more than once (a guild command is pushed once per
 * guild), and slash commands carry no context-menu name, so both collapse here. The split mirrors the
 * controller's two name-keyed maps, so the boot guard checks each name against its own kind.
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
