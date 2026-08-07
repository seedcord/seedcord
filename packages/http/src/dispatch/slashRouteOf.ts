import { buildSlashRoute } from '@seedcord/utils/internal';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

import type {
    APIApplicationCommandAutocompleteInteraction,
    APIChatInputApplicationCommandInteraction
} from 'discord-api-types/v10';

export type SlashLikeData = (
    APIChatInputApplicationCommandInteraction | APIApplicationCommandAutocompleteInteraction
)['data'];

// the raw-payload port of the gateway's slashRouteOf
// both assemble the key through buildSlashRoute, so a dispatched interaction always matches its generated registry key
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
