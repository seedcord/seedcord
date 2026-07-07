import type { ValidNonInteractionKeys } from '@handlers/BaseHandler';
import type { ClientEvents } from 'discord.js';
import type { IsUnion } from 'type-fest';

// a concrete payload tuple for a single event, never for a union, so a multi-event handler must use match
/** @internal */
export type SingleEventPayload<Names extends ValidNonInteractionKeys> =
    IsUnion<Names> extends true ? never : ClientEvents[Names];
