import { AutocompleteResponder } from '@seedcord/core/internal';

import type { Core } from '#interfaces/Core';
import type { DispatchContext } from '@seedcord/core';
import type { ApplicationCommandOptionChoiceData, AutocompleteInteraction } from 'discord.js';

export function autocompleteResponder(
    interaction: AutocompleteInteraction,
    core: Core,
    dispatch: DispatchContext
): AutocompleteResponder<ApplicationCommandOptionChoiceData> {
    return new AutocompleteResponder({ bus: core.bus, dispatch, interactionId: interaction.id }, (choices) =>
        interaction.respond(choices)
    );
}
