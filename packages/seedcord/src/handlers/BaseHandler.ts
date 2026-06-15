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
 * Interface for handlers that run pre-execution checks. Pair it with the `@Checkable` decorator, which
 * requires the class to implement `runChecks`.
 *
 * @see {@link Checkable}
 */
export interface WithChecks {
    /**
     * Runs pre-execution checks for the handler. A throw stops the lifecycle, the controller boundary
     * catches a `Notice` or a `Silence` thrown here before `execute` runs.
     *
     * @remarks Called automatically when the class is decorated with {@link Checkable}.
     *
     * @virtual Override this method in your handler classes
     */
    runChecks(): Promise<void>;
}

/** @internal */
export interface HandlerWithChecks extends WithChecks, Handler {}

/**
 * Not meant to be used directly.
 *
 * @internal
 */
export abstract class BaseHandler<ValidEvent extends ValidEventTypes> implements Handler {
    /** @internal */
    protected checkable = false;

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
     * Called automatically after all pre conditions are met. Holds the main logic of your handler. If
     * the class implements `WithChecks` and is decorated with `@Checkable`, `runChecks()` runs first,
     * and if it throws, `execute()` never runs.
     */
    abstract execute(): Promise<void>;

    /**
     * Override this in your handler classes to customize population logic. It runs at the end of the constructor before any async work.
     */
    protected populate(): void {}

    /** @internal */
    public hasChecks(): this is HandlerWithChecks {
        return this.checkable;
    }

    /** @internal */
    public getEvent(): ValidEvent {
        return this.event;
    }
}
