import { buildSlashRoute } from '@seedcord/utils/internal';

import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';

/**
 * Computes the dispatch route for a chat-input or autocomplete interaction. The controller and
 * `seedcord codegen` both assemble route keys through the same {@link buildSlashRoute}, so a dispatched
 * interaction and a generated registry key always match.
 *
 * @internal
 */
export function slashRouteOf(interaction: ChatInputCommandInteraction | AutocompleteInteraction): string {
    const group = interaction.options.getSubcommandGroup(false) ?? undefined;
    const subcommand = interaction.options.getSubcommand(false) ?? undefined;
    return buildSlashRoute(interaction.commandName, subcommand, group);
}
