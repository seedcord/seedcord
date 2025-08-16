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

/** All valid Discord.js interaction types that can be handled */
export type ValidInteractionTypes =
  | ChatInputCommandInteraction
  | ButtonInteraction
  | ModalSubmitInteraction
  | AutocompleteInteraction
  | AnySelectMenuInteraction
  | ContextMenuCommandInteraction;

/** All valid Discord.js client events except interaction events */
export type ValidNonInteractionTypes = ClientEvents[Exclude<keyof ClientEvents, Events.InteractionCreate>];

/** All event types that can be handled (interactions and client events) */
export type ValidEventTypes = ValidInteractionTypes | ValidNonInteractionTypes;

/** Interaction types that can receive replies (excludes autocomplete) */
export type Repliables = Exclude<ValidInteractionTypes, AutocompleteInteraction>;

/** Handler types that can reply to interactions */
export type RepliableInteractionHandler = InteractionHandler<Repliables> | InteractionMiddleware<Repliables>;

/** Base interface for event handlers */
export interface Handler {
  execute(): Promise<void>;
}

/**
 * Interface for handlers that can run pre-execution checks
 *
 * Should always accompany the `@Catchable` decorator. Will require the class to implement the `runChecks` method.
 *
 * @see {@link Checkable}
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

interface HandlerWithChecks extends WithChecks, Handler {}

abstract class BaseHandler<ValidEvent extends ValidEventTypes> implements Handler {
  protected checkable = false;
  protected break = false;
  protected errored = false;
  protected event: ValidEvent;
  protected args: string[] = [];

  protected constructor(
    event: ValidEvent,
    public core: Core,
    args?: string[]
  ) {
    this.event = event;
    this.args = args ?? [];
  }

  /**
   * Main handler logic - implement this method to define behavior
   * @virtual Override this method in your handler classes
   */
  abstract execute(): Promise<void>;

  public hasChecks(): this is HandlerWithChecks {
    return this.checkable;
  }

  public hasErrors(): boolean {
    return this.errored;
  }

  public setErrored(): void {
    this.errored = true;
  }

  public shouldBreak(): boolean {
    return this.break;
  }

  public getEvent(): ValidEvent {
    return this.event;
  }

  /**
   * Gets arguments parsed from interaction customId
   *
   * Arguments are extracted from customId using ":" and "-" separators.
   * For customId "accept:user123-guild456", returns ["user123", "guild456"]
   */
  protected getArgs(): string[] {
    return this.args;
  }

  /**
   * Gets a specific argument by index from parsed customId
   * @param index - Zero-based index of the argument to retrieve
   * @returns The argument at the specified index, or undefined if not found
   */
  protected getArg(index: number): string | undefined {
    return this.args[index];
  }
}

/**
 * Base class for Discord interaction handlers
 *
 * Extend this class to handle slash commands, buttons, modals, and select menus.
 * Use decorators like \@SlashRoute, \@ButtonRoute, etc. to define routing.
 *
 * @typeParam Repliable - The interaction type this handler processes
 */
export abstract class InteractionHandler<Repliable extends Repliables>
  extends BaseHandler<Repliable>
  implements Handler
{
  constructor(event: Repliable, core: Core, args?: string[]) {
    super(event, core, args);
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
  constructor(event: Repliable, core: Core, args?: string[]) {
    super(event, core, args);
  }
}

/**
 * Handler for Discord autocomplete interactions
 *
 * Extend this class to provide autocomplete suggestions for slash command options.
 * The focused option is automatically available via the `focused` property.
 */
export abstract class AutocompleteHandler extends BaseHandler<AutocompleteInteraction> implements Handler {
  /** The currently focused autocomplete option (Based on what you set in \@AutocompleteRoute) */
  protected readonly focused: AutocompleteFocusedOption;
  constructor(event: AutocompleteInteraction, core: Core, args?: string[]) {
    super(event, core, args);
    this.focused = this.event.options.getFocused(true);
  }
}

/**
 * Base class for Discord client event handlers
 *
 * Extend this class to handle Discord events like messageCreate, guildMemberAdd, etc.
 * Use the \@EventRegisterable decorator to specify which event to listen for.
 *
 * @typeParam Repliable - The Discord event type this handler processes
 */
export abstract class EventHandler<Repliable extends keyof ClientEvents>
  extends BaseHandler<ClientEvents[Repliable]>
  implements Handler
{
  constructor(event: ClientEvents[Repliable], core: Core, args?: string[]) {
    super(event, core, args);
  }
}

// A generic type alias for a handler constructor
/** Constructor type for interaction and autocomplete handlers */
export type HandlerConstructor = TypedConstructor<typeof InteractionHandler | typeof AutocompleteHandler>;

/** Constructor type for interaction middleware */
export type MiddlewareConstructor = TypedConstructor<typeof InteractionMiddleware> &
  (new (event: Repliables, core: Core, args?: string[]) => InteractionMiddleware<Repliables>);

/** Constructor type for autocomplete handlers */
export type AutocompleteHandlerConstructor = TypedConstructor<typeof AutocompleteHandler> &
  (new (event: AutocompleteInteraction, core: Core, args?: string[]) => AutocompleteHandler);

/** Constructor type for Discord client event handlers */
export type EventHandlerConstructor = TypedConstructor<typeof EventHandler>;
