import { SlashCommandBuilder } from '@discordjs/builders';
import { routeLeavesOf } from '@seedcord/utils/internal';

import type { ContextMenuCommandBuilder } from '@discordjs/builders';

/**
 * dedupes route keys since the same builder appears once per guild.
 * these come from the same {@link routeLeavesOf} that `seedcord codegen` reads, so the boot-time
 * check compares against the generated registry's keys.
 *
 * @internal
 */
export function slashRouteLeaves(commands: Iterable<SlashCommandBuilder | ContextMenuCommandBuilder>): Set<string> {
    const leaves = new Set<string>();
    for (const command of commands) {
        if (!(command instanceof SlashCommandBuilder)) continue;
        for (const leaf of routeLeavesOf(command.toJSON())) leaves.add(leaf.route);
    }
    return leaves;
}
