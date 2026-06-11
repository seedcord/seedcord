import { routeLeavesOf } from '@seedcord/utils/internal';
import { SlashCommandBuilder } from 'discord.js';

import type { ContextMenuCommandBuilder } from 'discord.js';

/**
 * Collects the route keys of every executable slash leaf across a set of command builders, deduplicated. The
 * same builder may appear more than once (a guild command is pushed once per guild), and context-menu
 * commands carry no slash route, so both collapse here. Route keys come from the same {@link routeLeavesOf}
 * that `seedcord codegen` reads, so the boot-time check compares against the generated registry's keys.
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
