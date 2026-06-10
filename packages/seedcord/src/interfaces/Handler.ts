import { Logger, SeedcordErrorCode } from '@seedcord/services';
import { SeedcordError } from '@seedcord/services/internal';

import { slashRouteOf } from '@bUtilities/miscellaneous/slashRouteOf';

import type { AutocompleteOptions, FocusedArms, FocusedField } from './AutocompleteOptions';
import type { Core } from './Core';
import type { SlashOptionRegistry, TypedConstructor } from '@seedcord/types';
import type {
    AnySelectMenuInteraction,
    ApplicationCommandOptionChoiceData,
    AutocompleteInteraction,
    ButtonInteraction,
    CacheType,
    ChatInputCommandInteraction,
    ClientEvents,
    ContextMenuCommandInteraction,
    Events,
    ModalSubmitInteraction
} from 'discord.js';
import type { IsUnion, Promisable } from 'type-fest';

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

// decode the focused option once per instance, cached in a module WeakMap. a subclass field would initialize
// after BaseHandler.populate() runs inside super(), so the cache cannot live on the instance.
const focusedCache = new WeakMap<object, { name: string; value: string }>();

/**
 * Base class for a Discord autocomplete handler.
 *
 * Pass the command route(s) from the generated registry as the generic, the same string(s) as
 * `@AutocompleteRoute`. Branch on the focused field with `this.match`, read already-entered sibling options
 * with `this.options`, and find which command fired with `this.route`.
 *
 * @typeParam Route - One or more route keys from {@link SlashOptionRegistry}, e.g. `'search'` or `'search' | 'find'`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 *
 * @example
 * ```ts
 * \@AutocompleteRoute('search')
 * class SearchAutocomplete extends AutocompleteHandler<'search'> {
 *     async execute() {
 *         await this.match({
 *             query: (value, respond) => respond([{ name: value, value }])
 *         });
 *     }
 * }
 * ```
 */
export abstract class AutocompleteHandler<Route extends keyof SlashOptionRegistry, Cache extends CacheType = 'cached'>
    extends BaseHandler<AutocompleteInteraction<Cache>>
    implements Handler
{
    constructor(event: AutocompleteInteraction<Cache>, core: Core) {
        super(event, core);
    }

    /**
     * The focused option for this interaction. `value` is always the raw partial string the user is typing,
     * even for an integer or number option, so coerce it yourself when you need a number.
     */
    protected get focused(): FocusedField<Route> {
        const cached = focusedCache.get(this);
        if (cached) return cached as FocusedField<Route>;
        const raw = this.event.options.getFocused(true);
        const focused = { name: raw.name, value: raw.value };
        focusedCache.set(this, focused);
        // the registry fixes the autocompletable names, a focused field outside that set fails the match lookup.
        return focused as FocusedField<Route>;
    }

    /**
     * Run the arm for the focused field.
     *
     * Provide one arm per autocompletable field across the registered commands. Each arm receives the
     * focused partial value and a `respond` pinned to that field's choice value type. A missing arm is a
     * compile error. A focused field with no arm, only reachable from a stale-deployed command, throws.
     *
     * @param arms - One handler per autocompletable field, keyed by field name.
     * @returns The result of the arm that ran.
     */
    protected async match<Ret>(arms: FocusedArms<Route, Ret>): Promise<Ret> {
        const { name, value } = this.focused;
        const respond = (choices: readonly ApplicationCommandOptionChoiceData[]): Promise<void> =>
            this.event.respond(choices);
        // justified: FocusedArms is keyed by field literals, the Record cast indexes it with the runtime field name.
        type Arm = (
            value: string,
            respond: (choices: readonly ApplicationCommandOptionChoiceData[]) => Promise<void>
        ) => Promisable<Ret>;
        const arm = (arms as Record<string, Arm>)[name];
        if (!arm) throw new SeedcordError(SeedcordErrorCode.AutocompleteMatchArmMissing, [name]);
        return await arm(value, respond);
    }

    /** The firing command route, for a field whose completion differs per registered command. */
    protected get route(): Route {
        return slashRouteOf(this.event) as Route;
    }

    /**
     * The already-entered options on this command, restricted to the kinds Discord resolves during autocomplete
     * (string, integer, number, boolean) with every read nullable, since a sibling is partial while the user
     * types the focused field. Read the focused field from `this.focused`, not here.
     */
    protected get options(): AutocompleteOptions<Route> {
        // the autocomplete resolver already carries these getters, AutocompleteOptions is its registry-typed view.
        return this.event.options as AutocompleteOptions<Route>;
    }
}

// a concrete payload tuple for a single event, never for a union, so a multi-event handler must use match
type SingleEventPayload<Names extends ValidNonInteractionKeys> =
    IsUnion<Names> extends true ? never : ClientEvents[Names];

// one arm per registered event, keyed by event name, receiving that event's payload as named params. spread,
// not a single tuple, so the discord.js tuple labels surface as parameter names in editor signature help, e.g.
// messageUpdate gives (oldMessage, newMessage).
type EventMatchArms<Names extends ValidNonInteractionKeys, Ret> = {
    [Name in Names]: (...args: ClientEvents[Name]) => Promisable<Ret>;
};

/**
 * Base class for a Discord client event handler.
 *
 * Pass the event name(s) as the generic, the same one(s) as `@RegisterEvent`. A single-event handler reads
 * `this.event` (the payload tuple) directly. A handler registered for several events branches with `this.match`,
 * keyed by event name, since the union of payload tuples is not directly readable.
 *
 * @typeParam Names - One or more `ClientEvents` keys, e.g. `Events.MessageCreate` or `Events.MessageCreate | Events.MessageUpdate`.
 *
 * @example
 * ```ts
 * \@RegisterEvent([Events.MessageCreate], [Events.MessageUpdate])
 * class PingPong extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
 *     async execute() {
 *         await this.match({
 *             [Events.MessageCreate]: (message) => message.reply('pong'),
 *             [Events.MessageUpdate]: (_oldMessage, edited) => edited.reply('pong')
 *         });
 *     }
 * }
 * ```
 */
export abstract class EventHandler<Names extends ValidNonInteractionKeys>
    extends BaseHandler<ClientEvents[Names]>
    implements Handler
{
    // the fired event name, threaded by the controller. undefined when constructed directly, e.g. in a test.
    private readonly firedEvent: Names | undefined;

    constructor(event: ClientEvents[Names], core: Core, eventName?: Names) {
        super(event, core);
        this.firedEvent = eventName;
    }

    // a concrete tuple for one event, never for several, so reading it on a multi-event handler is a compile error
    declare protected readonly event: SingleEventPayload<Names>;

    /**
     * Run the arm for whichever event fired, when this handler is registered for several events.
     *
     * Provide one arm per registered event, keyed by its name, and each arm receives that event's payload
     * tuple. A missing arm is a compile error. A single-event handler reads `this.event` directly instead.
     *
     * @param arms - One handler per registered event, keyed by event name.
     * @returns The result of the arm that ran.
     */
    protected async match<Ret>(arms: EventMatchArms<Names, Ret>): Promise<Ret> {
        const name = this.firedEvent;
        if (name === undefined) throw new SeedcordError(SeedcordErrorCode.EventMatchArmMissing, ['<no event>']);
        // justified: each arm takes its own payload tuple, so no single param type unifies the arms in a cast. read
        // the arm as unknown keyed by the runtime event name, then narrow to a function before calling it.
        const arm = (arms as Record<string, unknown>)[name];
        if (typeof arm !== 'function') throw new SeedcordError(SeedcordErrorCode.EventMatchArmMissing, [name]);
        // getEvent() carries the real payload tuple, this.event is narrowed to never for the multi-event view.
        // spread it so the arm receives the same named params its type declares.
        return await (arm as (...args: unknown[]) => Promisable<Ret>)(...this.getEvent());
    }
}

/**
 * Base class for Discord event middleware.
 *
 * Middleware runs before event handlers and can block execution with `setBreak()`. Unlike `EventHandler`, it
 * runs the SAME for every event it is registered for, so it has no `match`. Specify a single event in the
 * generic and `{ events }` to read `this.event` fully typed. Span several events (or omit `{ events }` for a
 * catchall) and `this.event` narrows to `never`, read `this.eventName` and do work that does not depend on the
 * payload shape. A middleware that needs each event's payload is written one event per class.
 *
 * @typeParam EventName - One or more `ClientEvents` keys. Defaults to every event (catchall).
 */
export abstract class EventMiddleware<in out EventName extends ValidNonInteractionKeys = ValidNonInteractionKeys>
    extends BaseHandler<ClientEvents[EventName]>
    implements Handler
{
    // the fired event name, threaded by the controller. undefined when constructed directly, e.g. in a test.
    private readonly firedEvent: EventName | undefined;

    constructor(event: ClientEvents[EventName], core: Core, eventName?: EventName) {
        super(event, core);
        this.firedEvent = eventName;
    }

    // a concrete tuple for one event, never for several or a catchall, so reading the payload on a multi-event
    // middleware is a compile error. branch on this.eventName and do payload-shape-independent work instead.
    declare protected readonly event: SingleEventPayload<EventName>;

    /**
     * The event that fired this middleware. Read it on a catchall or multi-event middleware, where `this.event`
     * is `never`, to do work that does not depend on the payload shape. A single-event middleware reads
     * `this.event` directly and does not need this.
     */
    protected get eventName(): EventName {
        if (this.firedEvent === undefined) throw new SeedcordError(SeedcordErrorCode.EventMiddlewareNameUnavailable);
        return this.firedEvent;
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
        core: Core,
        eventName?: EventName
    ) => EventMiddleware<EventName>);

/** @internal */
export type EventHandlerConstructor = TypedConstructor<typeof EventHandler>;
