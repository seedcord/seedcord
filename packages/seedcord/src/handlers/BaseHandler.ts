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
 * Interface for handlers that can run pre-execution checks
 *
 * Should always accompany the `@Catchable` decorator. Will require the class to implement the `runChecks` method.
 *
 * @see {@link Checkable}
 * @see {@link Catchable}
 * @see {@link EventCatchable}
 */
export interface WithChecks {
    /**
     * Runs pre-execution checks for the handler.
     *
     * @remarks It'll be called automatically if a class is decorated with {@link Checkable} before the execute method.
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

    private break = false;
    private errored = false;

    protected readonly event: ValidEvent;
    protected readonly logger: Logger;

    protected constructor(
        event: ValidEvent,
        public core: Core
    ) {
        this.event = event;
        this.logger = new Logger(this.constructor.name);

        this.populate();
    }

    /**
     * Called automatically after all pre conditions are met. This should contain the main logic of your handler. If your handler class implements `WithChecks` and is decorated with `@Checkable`, `runChecks()` will be called before this, and if it throws or calls `setBreak()`, `execute()` will not run.
     */
    abstract execute(): Promise<void>;

    /**
     * Override this in your handler classes to customize population logic. It runs at the end of the constructor before any async work.
     */
    protected populate(): void {
        // Does nothing unless overriden
    }

    /** @internal */
    public hasChecks(): this is HandlerWithChecks {
        return this.checkable;
    }

    /** @internal */
    public hasErrors(): boolean {
        return this.errored;
    }

    /** @internal */
    public setErrored(): void {
        this.errored = true;
    }

    /** Stops handler execution after `runChecks()` without throwing. Does not require `HandlerWithChecks`. */
    public setBreak(): void {
        this.break = true;
    }

    /** @internal */
    public shouldBreak(): boolean {
        return this.break;
    }

    /** @internal */
    public getEvent(): ValidEvent {
        return this.event;
    }
}
