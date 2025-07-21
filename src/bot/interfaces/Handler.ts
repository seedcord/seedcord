import type { CoreBot } from '../../core/CoreBot';
import type { TypedConstructor } from '../../core/library/types/Miscellaneous';
import type {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  ClientEvents,
  Events,
  ModalSubmitInteraction,
  StringSelectMenuInteraction
} from 'discord.js';

export type ValidInteractionTypes =
  | ChatInputCommandInteraction
  | ButtonInteraction
  | StringSelectMenuInteraction
  | ModalSubmitInteraction
  | AutocompleteInteraction;

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

abstract class BaseHandler<T extends ValidEventTypes> implements Handler {
  protected checkable = false;
  protected break = false;
  protected errored = false;
  protected event: T;

  protected constructor(
    event: T,
    public core: CoreBot
  ) {
    this.event = event;
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

  public getEvent(): T {
    return this.event;
  }
}

/**
 * All interactions with the bot including Handlers and what those handlers do or pass to other services should extend this class.
 * This class implements ICheckable when the decorator Checkable is used on the class.
 * @implements Handler
 * @template T - A type that extends one of the ValidEventTypes. Can add more types to the ValidEventTypes union type if needed.
 */
export abstract class InteractionHandler<T extends Repliables> extends BaseHandler<T> implements Handler {
  constructor(event: T, core: CoreBot) {
    super(event, core);
  }
}

export abstract class InteractionMiddleware<T extends Repliables> extends BaseHandler<T> implements Handler {
  constructor(event: T, core: CoreBot) {
    super(event, core);
  }
}

/**
 * All non-interaction events with the bot including Handlers and what those handlers do or pass to other services should extend this class.
 * This class implements ICheckable when the decorator Checkable is used on the class.
 * @implements Handler
 * @template T - A type that extends one of the ValidEventTypes. Can add more types to the ValidEventTypes union type if needed.
 */
export abstract class EventHandler<T extends keyof ClientEvents>
  extends BaseHandler<ClientEvents[T]>
  implements Handler
{
  constructor(event: ClientEvents[T], core: CoreBot) {
    super(event, core);
  }
}

// A generic type alias for a handler constructor
export type HandlerConstructor = TypedConstructor<typeof InteractionHandler>;

export type MiddlewareConstructor = TypedConstructor<typeof InteractionMiddleware>;

export type EventHandlerConstructor = TypedConstructor<typeof EventHandler>;
