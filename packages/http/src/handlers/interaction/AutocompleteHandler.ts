import { InteractionResponseType, Routes } from 'discord-api-types/v10';

import { BaseHandler } from '@handlers/BaseHandler';

import type { Core } from '@interfaces/Core';
import type { SlashOptionRegistry, DispatchContext } from '@seedcord/core';
import type {
    APIApplicationCommandOptionChoice,
    APIApplicationCommandAutocompleteInteraction
} from 'discord-api-types/v10';

/**
 * Base class for an autocomplete handler on the HTTP transport.
 *
 * Pass the command route(s) from the generated registry as the generic. Send suggestions with
 * `this.respond`.
 *
 * @typeParam Route - One or more route keys from {@link SlashOptionRegistry}, e.g. `'search'`.
 */
export abstract class AutocompleteHandler<
    Route extends keyof SlashOptionRegistry
> extends BaseHandler<APIApplicationCommandAutocompleteInteraction> {
    // the dispatcher needs a public construct signature, BaseHandler's ctor is protected
    constructor(event: APIApplicationCommandAutocompleteInteraction, core: Core, dispatch?: DispatchContext) {
        super(event, core, dispatch);
    }

    // anchors the Route generic until the option resolver reads it (this.focused / this.match / this.options)
    declare protected readonly __route?: Route;

    /** Send autocomplete suggestions, callback type 8. */
    protected async respond(choices: readonly APIApplicationCommandOptionChoice[]): Promise<void> {
        await this.core.rest.post(Routes.interactionCallback(this.event.id, this.event.token), {
            body: { type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices } }
        });
    }
}
