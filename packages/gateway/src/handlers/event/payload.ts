import type { ValidNonInteractionKeys } from '#src/handlers/interactionTypes';
import type { ClientEvents } from 'discord.js';
import type { IsUnion } from 'type-fest';

// EventHandler.match reads this instead on a multi-event handler
/** @internal */
export type SingleEventPayload<Names extends ValidNonInteractionKeys> =
    IsUnion<Names> extends true ? never : ClientEvents[Names];
