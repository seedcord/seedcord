import type { Repliables, ValidNonInteractionKeys } from '@handlers/BaseHandler';
import type { EventHandler } from '@handlers/event/EventHandler';
import type { EventMiddleware } from '@handlers/event/EventMiddleware';
import type { InteractionHandler } from '@handlers/interaction/InteractionHandler';
import type { InteractionMiddleware } from '@handlers/interaction/InteractionMiddleware';

/** @internal */
export type RepliableInteractionHandler = InteractionHandler<Repliables> | InteractionMiddleware<Repliables>;

/** @internal */
export type RepliableEventHandler = EventHandler<ValidNonInteractionKeys> | EventMiddleware<ValidNonInteractionKeys>;
