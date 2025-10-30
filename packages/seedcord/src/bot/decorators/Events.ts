import type { EventFrequency } from '../../types';
import type { ClientEvents } from 'discord.js';
import type { Constructor } from 'type-fest';

/**
 * Metadata key used to store event handler information
 *
 * @internal
 */
export const EventMetadataKey = Symbol('event:metadata');

/** Options accepted by the `@RegisterEvent` decorator. */
export interface RegisterEventOptions {
    /** Frequency: `'once'` or `'on'`. Defaults to `'on'`. */
    readonly frequency?: EventFrequency | undefined;
}

/**
 * Metadata entry representing a registered event handler.
 *
 * @internal
 */
export interface RegisterEventMetadataEntry<KeyofEvents extends keyof ClientEvents> {
    readonly event: KeyofEvents;
    readonly frequency: EventFrequency;
}

/**
 * Registers an event handler class with a one or multiple Discord.js event(s).
 *
 * Associates the decorated class with the mentioned Discord client event(s) for automatic registration and execution when the event is emitted.
 *
 * You can use this decorator multiple times on the same class to register for different events with varying option settings.
 *
 * @typeParam KeyofEvents - The key of the Discord.js ClientEvents to register for
 * @param events - The Discord.js event name(s) to listen for
 * @param options - Options to configure the event handler registration.
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
 *
 * @example
 * ```ts
 * \@RegisterEvent(Events.MessageCreate, { frequency: 'once' })
 * class OneTimeMessageHandler extends EventHandler<Events.MessageCreate> {
 *   async execute() {
 *     // Handle only the first message creation
 *   }
 * }
 * ```
 */
export function RegisterEvent<KeyofEvents extends keyof ClientEvents>(
    events: KeyofEvents | KeyofEvents[],
    options?: RegisterEventOptions
) {
    return function (constructor: Constructor<unknown>): void {
        const saved = Reflect.getMetadata(EventMetadataKey, constructor) as
            | RegisterEventMetadataEntry<KeyofEvents>[]
            | undefined;
        const existing = saved ?? [];

        const toStore = Array.isArray(events) ? events : [events];
        const frequency = options?.frequency ?? 'on';

        const entries = toStore.map<RegisterEventMetadataEntry<KeyofEvents>>((event) => ({ event, frequency }));

        Reflect.defineMetadata(EventMetadataKey, [...existing, ...entries], constructor);
    };
}
