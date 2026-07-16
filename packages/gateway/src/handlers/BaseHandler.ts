import { BaseHandler as CoreBaseHandler } from '@seedcord/core';

import type { Core } from '@interfaces/Core';
import type {
    AnySelectMenuInteraction,
    AutocompleteInteraction,
    ButtonInteraction,
    ChatInputCommandInteraction,
    ClientEvents,
    ContextMenuCommandInteraction,
    Events,
    ModalSubmitInteraction
} from 'discord.js';

export type ValidInteractionTypes =
    | ChatInputCommandInteraction
    | ButtonInteraction
    | ModalSubmitInteraction
    | AutocompleteInteraction
    | AnySelectMenuInteraction
    | ContextMenuCommandInteraction;

export type ValidNonInteractionKeys = Exclude<keyof ClientEvents, Events.InteractionCreate>;

export type ValidEventTypes = ValidInteractionTypes | ClientEvents[ValidNonInteractionKeys];

export type Repliables = Exclude<ValidInteractionTypes, AutocompleteInteraction>;

export type NonModalInteraction = Exclude<Repliables, ModalSubmitInteraction>;

/**
 * The gateway base, fixes the core base's `TCore` to the gateway {@link Core} and adds the `getEvent`
 * gate hook.
 */
export abstract class BaseHandler<ValidEvent extends ValidEventTypes> extends CoreBaseHandler<ValidEvent, Core> {
    /** @internal */
    public getEvent(): ValidEvent {
        return this.event;
    }
}
