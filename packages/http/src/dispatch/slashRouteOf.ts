import { buildSlashRoute } from '@seedcord/utils/internal';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

import type {
    APIApplicationCommandAutocompleteInteraction,
    APIChatInputApplicationCommandInteraction
} from 'discord-api-types/v10';

export type SlashLikeData = (
    APIChatInputApplicationCommandInteraction | APIApplicationCommandAutocompleteInteraction
)['data'];

/**
 * Computes the dispatch route for a chat-input or autocomplete payload, the raw-payload port of the
 * gateway's `slashRouteOf`. Both assemble keys through `buildSlashRoute`, so a dispatched interaction
 * and a generated registry key always match.
 */
export function slashRouteOf(data: SlashLikeData): string {
    const first = data.options?.[0];
    if (first?.type === ApplicationCommandOptionType.SubcommandGroup) {
        return buildSlashRoute(data.name, first.options[0]?.name, first.name);
    }
    if (first?.type === ApplicationCommandOptionType.Subcommand) {
        return buildSlashRoute(data.name, first.name);
    }
    return data.name;
}
