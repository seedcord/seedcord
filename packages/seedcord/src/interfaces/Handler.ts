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

export type ValidNonInteractionTypes = ClientEvents[Exclude<keyof ClientEvents, Events.InteractionCreate>];
export type ValidEventTypes = ValidInteractionTypes | ValidNonInteractionTypes;

export type Repliables = Exclude<ValidInteractionTypes, AutocompleteInteraction>;

export type RepliableInteractionHandler = InteractionHandler<Repliables> | InteractionMiddleware<Repliables>;

export interface Handler {
  execute(): Promise<void>;
}

export interface WithChecks {
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
   * Get the arguments passed from the customId
   * For example, if customId is "accept:user123-guild456", args will be ["user123", "guild456"]
   */
  protected getArgs(): string[] {
    return this.args;
  }

  /**
   * Get a specific argument by index
   */
  protected getArg(index: number): string | undefined {
    return this.args[index];
  }
}

/**
 * All interactions with the bot including Handlers and what those hooks do or pass to other services should extend this class.
 * This class implements ICheckable when the decorator Checkable is used on the class.
 * @implements Handler
 * @template Repliable - A type that extends one of the ValidEventTypes. Can add more types to the ValidEventTypes union type if needed.
 */
export abstract class InteractionHandler<Repliable extends Repliables>
  extends BaseHandler<Repliable>
  implements Handler
{
  constructor(event: Repliable, core: Core, args?: string[]) {
    super(event, core, args);
  }
}

export abstract class InteractionMiddleware<Repliable extends Repliables>
  extends BaseHandler<Repliable>
  implements Handler
{
  constructor(event: Repliable, core: Core, args?: string[]) {
    super(event, core, args);
  }
}

/**
 * Autocomplete interactions handler - separate from repliable interactions
 */
export abstract class AutocompleteHandler extends BaseHandler<AutocompleteInteraction> implements Handler {
  protected readonly focused: AutocompleteFocusedOption;
  constructor(event: AutocompleteInteraction, core: Core, args?: string[]) {
    super(event, core, args);
    this.focused = this.event.options.getFocused(true);
  }
}

/**
 * All non-interaction events with the bot including Handlers and what those hooks do or pass to other services should extend this class.
 * This class implements ICheckable when the decorator Checkable is used on the class.
 * @implements Handler
 * @template Repliable - A type that extends one of the ValidEventTypes. Can add more types to the ValidEventTypes union type if needed.
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
export type HandlerConstructor = TypedConstructor<typeof InteractionHandler | typeof AutocompleteHandler>;

export type MiddlewareConstructor = TypedConstructor<typeof InteractionMiddleware> &
  (new (event: Repliables, core: Core, args?: string[]) => InteractionMiddleware<Repliables>);

export type AutocompleteHandlerConstructor = TypedConstructor<typeof AutocompleteHandler> &
  (new (event: AutocompleteInteraction, core: Core, args?: string[]) => AutocompleteHandler);

export type EventHandlerConstructor = TypedConstructor<typeof EventHandler>;
