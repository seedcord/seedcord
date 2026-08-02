import { ApplicationCommandOptionType } from 'discord-api-types/v10';

import { buildSlashRoute } from './buildSlashRoute';

import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';

// indexed off the REST body, which widens each option with undefined under exactOptionalPropertyTypes. the
// bare APIApplicationCommandOption union is unassignable here.
type CommandOption = NonNullable<RESTPostAPIChatInputApplicationCommandsJSONBody['options']>[number];

/** One executable slash route and the basic options at that leaf. */
export interface SlashRouteLeaf {
    route: string;
    /** The subcommand's description. For a command with no subcommands, the command's own description. */
    description: string;
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
    if (!hasRouting) return [{ route: buildSlashRoute(json.name), description: json.description, options }];

    const leaves: SlashRouteLeaf[] = [];
    for (const option of options) {
        if (option.type === ApplicationCommandOptionType.SubcommandGroup) {
            for (const sub of option.options ?? []) {
                leaves.push({
                    route: buildSlashRoute(json.name, sub.name, option.name),
                    description: sub.description,
                    options: sub.options ?? []
                });
            }
        } else if (option.type === ApplicationCommandOptionType.Subcommand) {
            leaves.push({
                route: buildSlashRoute(json.name, option.name),
                description: option.description,
                options: option.options ?? []
            });
        }
    }
    return leaves;
}
