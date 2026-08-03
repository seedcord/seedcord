import { SlashCommandBuilder } from '@discordjs/builders';
import { routeLeavesOf } from '@seedcord/utils/internal';

import type { ContextMenuCommandBuilder } from '@discordjs/builders';

/**
 * Collects the route keys of every executable slash leaf across a set of command builders, deduplicated
 * because the same builder appears once per guild. The keys come from the same {@link routeLeavesOf} that
 * `seedcord codegen` reads, so the boot-time check compares against the generated registry's keys.
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
