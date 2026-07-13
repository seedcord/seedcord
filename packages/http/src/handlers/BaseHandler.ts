import { Logger } from '@seedcord/logger';

import type { Core } from '@interfaces/Core';
import type { DispatchContext } from '@seedcord/core';
import type {
    APIApplicationCommandAutocompleteInteraction,
    APIChatInputApplicationCommandInteraction,
    APIContextMenuInteraction,
    APIMessageComponentInteraction,
    APIModalSubmitInteraction
} from 'discord-api-types/v10';

export type ValidInteractionTypes =
    | APIChatInputApplicationCommandInteraction
    | APIContextMenuInteraction
    | APIMessageComponentInteraction
    | APIModalSubmitInteraction
    | APIApplicationCommandAutocompleteInteraction;

export type Repliables = Exclude<ValidInteractionTypes, APIApplicationCommandAutocompleteInteraction>;

interface Handler {
    execute(): Promise<void>;
}

/**
 * Base class for an HTTP interaction handler. Don't register handlers directly. Use the more specific
 * handler subclasses.
 */
export abstract class BaseHandler<Event extends ValidInteractionTypes> implements Handler {
    protected readonly event: Event;
    protected readonly logger: Logger;
    protected readonly dispatch?: DispatchContext | undefined;

    protected constructor(
        event: Event,
        public readonly core: Core,
        dispatch?: DispatchContext
    ) {
        this.event = event;
        this.logger = new Logger(this.constructor.name);
        this.dispatch = dispatch;
    }

    /** Runs after the handler's gates pass, so a gate that refuses stops it. */
    abstract execute(): Promise<void>;
}
