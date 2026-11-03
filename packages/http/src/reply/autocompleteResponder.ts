import { AutocompleteResponder } from '@seedcord/core/internal';
import { InteractionResponseType, Routes } from 'discord-api-types/v10';

import type { Core } from '#interfaces/Core';
import type { DispatchContext } from '@seedcord/core';
import type { APIApplicationCommandOptionChoice, APIInteraction } from 'discord-api-types/v10';

export function autocompleteResponder(
    payload: Pick<APIInteraction, 'id' | 'token'>,
    core: Core,
    dispatch: DispatchContext
): AutocompleteResponder<APIApplicationCommandOptionChoice> {
    return new AutocompleteResponder({ bus: core.bus, dispatch, interactionId: payload.id }, (choices) =>
        core.rest.post(Routes.interactionCallback(payload.id, payload.token), {
            body: { type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices } }
        })
    );
}
