import { Logger } from '@seedcord/logger';

import type { Core } from '@interfaces/Core';
import type { DispatchContext } from '@seedcord/core';
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

/** @internal */
export interface Handler {
    execute(): Promise<void>;
}

/**
 * Base class for a Discord event or interaction handler. Don't register handlers directly, use the more specific handler subclasses.
 */
export abstract class BaseHandler<ValidEvent extends ValidEventTypes> implements Handler {
    protected readonly event: ValidEvent;
    protected readonly logger: Logger;
    // the per-dispatch bag, set on an interaction handler, undefined on an event handler for now
    protected readonly dispatch?: DispatchContext | undefined;

    protected constructor(
        event: ValidEvent,
        public readonly core: Core,
        dispatch?: DispatchContext
    ) {
        this.event = event;
        this.logger = new Logger(this.constructor.name);
        this.dispatch = dispatch;
    }

    /**
     * Holds the main logic of your handler. The dispatcher calls it after the handler's gates pass, so a
     * gate that refuses stops `execute()` from running.
     */
    abstract execute(): Promise<void>;

    /** @internal */
    public getEvent(): ValidEvent {
        return this.event;
    }
}
