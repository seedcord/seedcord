import type { ConstructorFunction } from '@seedcord/types';
import type { ClientEvents } from 'discord.js';

export const EventMetadataKey = Symbol('event:metadata');

/**
 * Registers an event handler class with a specific Discord.js event.
 *
 * Associates the decorated class with a Discord client event for automatic
 * registration and execution when the event is emitted.
 *
 * @param eventName - The Discord.js event name to listen for
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
 */
export function RegisterEvent<KeyofEvents extends keyof ClientEvents>(eventName: KeyofEvents) {
    return function (constructor: ConstructorFunction): void {
        Reflect.defineMetadata(EventMetadataKey, eventName, constructor);
    };
}
