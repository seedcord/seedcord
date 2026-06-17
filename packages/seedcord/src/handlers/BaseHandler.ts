import { Logger } from '@seedcord/services';

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

    protected constructor(
        event: ValidEvent,
        public readonly core: Core
    ) {
        this.event = event;
        this.logger = new Logger(this.constructor.name);

        this.populate();
    }

    /**
     * Holds the main logic of your handler. The dispatcher calls it after the handler's gates pass, so a
     * gate that refuses stops `execute()` from running.
     */
    abstract execute(): Promise<void>;

    /**
     * Override this in your handler classes to customize population logic. It runs at the end of the constructor before any async work.
     */
    protected populate(): void {}

    /** @internal */
    public getEvent(): ValidEvent {
        return this.event;
    }
}
