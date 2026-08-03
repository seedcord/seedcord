import { EventMetadataKey } from '@seedcord/core/internal';

import type { EventHandler } from '@handlers/event';
import type { EventFrequency } from '@seedcord/types';
import type { ValidNonInteractionKeys } from '@src/handlers/interactionTypes';
import type { ClientEvents } from 'discord.js';
import type { Constructor } from 'type-fest';

/** Options accepted by the event registration decorator. */
export interface RegisterEventOptions {
    /**
     * Frequency: 'once' or 'on'.
     *
     * @defaultValue `'on'`
     */
    readonly frequency?: EventFrequency | undefined;
}

/** @internal */
export interface RegisterEventMetadataEntry<EventKey extends keyof ClientEvents> {
    readonly event: EventKey;
    readonly frequency: EventFrequency;
}

/** Tuple describing a single event and optional options. */
export type EventSpec<EventKey extends ValidNonInteractionKeys> = readonly [
    event: EventKey,
    options?: RegisterEventOptions
];

/**
 * Registers an event handler class with one or more Discord.js events.
 *
 * Associates the decorated class with the provided Discord client events for automatic registration and execution when those events are emitted.
 *
 * Supply any number of event tuples. Each tuple can include per event options.
 *
 * @typeParam EventKey - Union of Discord.js ClientEvents keys to register for
 * @param defs - One or more tuples of [event, options]
 * @decorator
 * @example
 * ```ts
 * \@RegisterEvent([Events.MessageCreate])
 * class MessageHandler extends EventHandler<Events.MessageCreate> {
 *   async execute() {
 *     // Handle message creation
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * \@RegisterEvent([Events.MessageCreate], [Events.MessageUpdate])
 * class MessageHandler extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
 *   async execute() {
 *     // Handle message creation or update
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * \@RegisterEvent([Events.MessageCreate, { frequency: 'once' }], [Events.MessageUpdate])
 * class OneTimeMessageHandler extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
 *   async execute() {
 *     // Handle only the first message creation, and message update normally
 *   }
 * }
 * ```
 */
export function RegisterEvent<const Defs extends readonly EventSpec<ValidNonInteractionKeys>[]>(...defs: Defs) {
    type EventKey = Defs[number][0];

    // EventHandler is invariant in its Names generic (match puts Names in the arms, a contravariant position), so
    // this single constraint rejects a handler whose generic and decorator list different events, both directions.
    return function <HandlerCtor extends Constructor<EventHandler<EventKey>>>(constructor: HandlerCtor): void {
        const saved = Reflect.getMetadata(EventMetadataKey, constructor) as
            | RegisterEventMetadataEntry<EventKey>[]
            | undefined;
        const existing = saved ?? [];

        const entries = defs.map<RegisterEventMetadataEntry<EventKey>>(([event, options]) => ({
            event,
            frequency: options?.frequency ?? 'on'
        }));

        Reflect.defineMetadata(EventMetadataKey, [...existing, ...entries], constructor);
    };
}
