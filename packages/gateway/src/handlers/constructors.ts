import type { EventHandler } from '@handlers/event/EventHandler';
import type { EventMiddleware } from '@handlers/event/EventMiddleware';
import type { AutocompleteHandler } from '@handlers/interaction/AutocompleteHandler';
import type { InteractionHandler } from '@handlers/interaction/InteractionHandler';
import type { InteractionMiddleware } from '@handlers/interaction/InteractionMiddleware';
import type { Core } from '@interfaces/Core';
import type { TypedConstructor } from '@seedcord/types';
import type { ValidNonInteractionKeys } from '@src/handlers/interactionTypes';
import type { ClientEvents } from 'discord.js';

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
