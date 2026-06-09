import { Logger } from '@seedcord/services';

import type { Core } from './Core';
import type { TypedConstructor } from '@seedcord/types';
import type {
    AnySelectMenuInteraction,
    AutocompleteFocusedOption,
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

export type RepliableInteractionHandler = InteractionHandler<Repliables> | InteractionMiddleware<Repliables>;

export type RepliableEventHandler = EventHandler<ValidNonInteractionKeys> | EventMiddleware<ValidNonInteractionKeys>;

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

/**
 * Base class for Discord interaction handlers
 *
 * Extend this class to handle slash commands, buttons, modals, and select menus.
 * Use decorators like `@SlashRoute`, `@ButtonRoute`, etc. to define routing.
 *
 * @typeParam Repliable - The interaction type this handler processes
 */
export abstract class InteractionHandler<Repliable extends Repliables>
    extends BaseHandler<Repliable>
    implements Handler
{
    constructor(event: Repliable, core: Core) {
        super(event, core);
    }
}

/**
 * Base class for interaction middleware
 *
 * Middleware runs before interaction handlers and can modify behavior or block execution.
 * Unlike handlers, middleware should not send responses directly.
 *
 * @typeParam Repliable - The interaction type this middleware processes
 */
export abstract class InteractionMiddleware<Repliable extends Repliables>
    extends BaseHandler<Repliable>
    implements Handler
{
    constructor(event: Repliable, core: Core) {
        super(event, core);
    }
}

/**
 * Handler for Discord autocomplete interactions
 *
 * Extend this class to provide autocomplete suggestions for slash command options.
 * The focused option is automatically available via the `focused` property.
 *
 * Middlewares do not work on Autocomplete Interactions.
 */
export abstract class AutocompleteHandler extends BaseHandler<AutocompleteInteraction> implements Handler {
    /** The currently focused autocomplete option (Based on what you set in {@link AutocompleteRoute}) */
    protected readonly focused: AutocompleteFocusedOption;

    constructor(event: AutocompleteInteraction, core: Core) {
        super(event, core);
        this.focused = this.event.options.getFocused(true);
    }
}

/**
 * Base class for Discord client event handlers
 *
 * Extend this class to handle Discord events like messageCreate, guildMemberAdd, etc.
 * Use the `RegisterEvent` decorator to specify which event to listen for.
 *
 * @typeParam Repliable - The Discord event type this handler processes
 */
export abstract class EventHandler<Repliable extends ValidNonInteractionKeys>
    extends BaseHandler<ClientEvents[Repliable]>
    implements Handler
{
    constructor(event: ClientEvents[Repliable], core: Core) {
        super(event, core);
    }
}

/**
 * Base class for Discord event middleware
 *
 * Middleware runs before event handlers and can modify behavior or block execution.
 */
export abstract class EventMiddleware<EventName extends ValidNonInteractionKeys>
    extends BaseHandler<ClientEvents[EventName]>
    implements Handler
{
    constructor(event: ClientEvents[EventName], core: Core) {
        super(event, core);
    }
}

/** @internal */
export type HandlerConstructor = TypedConstructor<typeof InteractionHandler | typeof AutocompleteHandler>;

/** @internal */
export type InteractionMiddlewareConstructor = TypedConstructor<typeof InteractionMiddleware>;

/** @internal */
export type EventMiddlewareConstructor = TypedConstructor<typeof EventMiddleware> &
    (new <EventName extends ValidNonInteractionKeys>(
        event: ClientEvents[EventName],
        core: Core
    ) => EventMiddleware<EventName>);

/** @internal */
export type AutocompleteHandlerConstructor = TypedConstructor<typeof AutocompleteHandler>;

/** @internal */
export type EventHandlerConstructor = TypedConstructor<typeof EventHandler>;
