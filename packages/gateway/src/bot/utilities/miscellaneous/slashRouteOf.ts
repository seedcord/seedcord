import { buildSlashRoute } from '@seedcord/utils/internal';

import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';

// the controller and seedcord codegen both build routes through buildSlashRoute, so a dispatched
// interaction always matches its generated registry key
export function slashRouteOf(interaction: ChatInputCommandInteraction | AutocompleteInteraction): string {
    const group = interaction.options.getSubcommandGroup(false) ?? undefined;
    const subcommand = interaction.options.getSubcommand(false) ?? undefined;
    return buildSlashRoute(interaction.commandName, subcommand, group);
}
