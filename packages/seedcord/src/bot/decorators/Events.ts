import { areRoutes } from '../../miscellaneous/areRoutes';

import type { ClientEvents } from 'discord.js';
import type { Constructor } from 'type-fest';

export const EventMetadataKey = Symbol('event:metadata');

/**
 * Registers an event handler class with a one or multiple Discord.js event(s).
 *
 * Associates the decorated class with the mentioned Discord client event(s) for automatic
 * registration and execution when the event is emitted.
 *
 * @typeParam KeyofEvents - The key of the Discord.js ClientEvents to register for
 * @param events - The Discord.js event name(s) to listen for
 * @decorator
 * @example
 * ```typescript
 * \@RegisterEvent(Events.MessageCreate)
 * class MessageHandler extends EventHandler<Events.MessageCreate> {
 *   async execute() {
 *     // Handle message creation
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * \@RegisterEvent([Events.MessageCreate, Events.MessageUpdate])
 * class MessageHandler extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
 *   async execute() {
 *     // Handle message creation or update
 *   }
 * }
 * ```
 */
export function RegisterEvent<KeyofEvents extends keyof ClientEvents>(events: KeyofEvents | KeyofEvents[]) {
    return function (constructor: Constructor<unknown>): void {
        const saved: unknown = Reflect.getMetadata(EventMetadataKey, constructor);
        const existing: string[] = areRoutes(saved) ? saved : [];

        const toStore = Array.isArray(events) ? events : [events];
        Reflect.defineMetadata(EventMetadataKey, [...existing, ...toStore], constructor);
    };
}
