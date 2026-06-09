import { ApplicationCommandOptionType } from 'discord-api-types/v10';

import { buildSlashRoute } from './buildSlashRoute';

import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';

// the REST body widens each option with undefined under exactOptionalPropertyTypes, so index it rather than
// referencing the bare APIApplicationCommandOption union, which would not be assignable.
type CommandOption = NonNullable<RESTPostAPIChatInputApplicationCommandsJSONBody['options']>[number];

/** One executable slash route and the basic options that live at that leaf. */
export interface SlashRouteLeaf {
    route: string;
    options: readonly CommandOption[];
}

/**
 * Enumerates the executable route leaves of a chat-input command's JSON. A command with no subcommands is a
 * single leaf at its name. Each subcommand and grouped subcommand is its own leaf, keyed through
 * {@link buildSlashRoute} so a generated registry and a dispatched interaction resolve to the same string. A
 * subcommand group with no subcommands deploys nothing on Discord, so it yields no leaf.
 */
export function routeLeavesOf(json: RESTPostAPIChatInputApplicationCommandsJSONBody): SlashRouteLeaf[] {
    const options = json.options ?? [];
    const hasRouting = options.some(
        (option) =>
            option.type === ApplicationCommandOptionType.Subcommand ||
            option.type === ApplicationCommandOptionType.SubcommandGroup
    );
    if (!hasRouting) return [{ route: buildSlashRoute(json.name), options }];

    const leaves: SlashRouteLeaf[] = [];
    for (const option of options) {
        if (option.type === ApplicationCommandOptionType.SubcommandGroup) {
            for (const sub of option.options ?? []) {
                leaves.push({ route: buildSlashRoute(json.name, sub.name, option.name), options: sub.options ?? [] });
            }
        } else if (option.type === ApplicationCommandOptionType.Subcommand) {
            leaves.push({ route: buildSlashRoute(json.name, option.name), options: option.options ?? [] });
        }
    }
    return leaves;
}
