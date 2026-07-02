import type { Notice } from '@seedcord/kit';
import type { Nullable } from '@seedcord/types';
import type { Guild, User } from 'discord.js';
import type { UUID } from 'node:crypto';

/**
 * Where a reported fault came from. A union over `kind`.
 */
export type FaultSource = InteractionFaultSource | EventFaultSource;

/**
 * A fault that came from a discord interaction, JSON-safe for a webhook payload.
 */
export interface InteractionFaultSource {
    kind: 'interaction';
    /** Which interaction kind produced the fault. */
    interactionKind: 'slash' | 'context-menu' | 'button' | 'select' | 'modal';
    /** Slash or context-menu command name, null for component and modal interactions. */
    command: string | null;
    /** Component or modal customId, null for slash and context-menu interactions. */
    customId: string | null;
    /** User who triggered the interaction. */
    userId: string;
    /** Guild the interaction came from, null in DMs. */
    guildId: string | null;
    /** Channel the interaction came from, null when unavailable. */
    channelId: string | null;
    /** The interaction's own id. */
    interactionId: string;
    /** The raw interaction, made JSON-safe at serialization with filterCirculars. */
    raw: unknown;
}

/**
 * A fault that came from a client event, JSON-safe for a webhook payload. The actor, guild, and channel
 * are best-effort, derived from the event args, so each is nullable. The raw args carry the full detail.
 */
export interface EventFaultSource {
    kind: 'event';
    eventName: string;
    handler: string;
    /** Actor derived from the event args, null when none is present. */
    userId: string | null;
    /** Guild derived from the event args, null outside a guild. */
    guildId: string | null;
    /** Channel derived from the event args, null when none is present. */
    channelId: string | null;
    /** The raw event args, made JSON-safe at serialization with filterCirculars. */
    raw: unknown;
}

/**
 * Default subscribers that are always available in the framework.
 */
interface DefaultSubscriptions {
    /** Triggered when an unhandled exception (a raw non-Notice throw) occurs */
    unknownException: {
        uuid: UUID;
        error: Error;
        guild: Nullable<Guild>;
        user: Nullable<User>;
        metadata?: unknown;
    };
    /** Triggered when a reported Notice (`report: true`) is caught */
    handledException: {
        denial: Notice;
        uuid: UUID;
        source: FaultSource;
    };
}

/**
 * Custom subscribers defined by the application.
 *
 * This interface can be augmented via declaration merging to add
 * type-safe custom subscriber definitions for emitting custom subscribers anywhere in the application.
 *
 * @example
 * ```typescript
 * declare module 'seedcord' {
 *   interface Subscriptions {
 *     'userJoin': { user: User; guild: Guild };
 *     'levelUp': { user: User; level: number; guild: Guild };
 *   }
 * }
 * ```
 */
export interface Subscriptions {}

/**
 * Combined subscribers interface containing both default and custom subscribers.
 */
export interface AllSubscriptions extends DefaultSubscriptions, Subscriptions {}

/**
 * Helper type to extract all available subscriber event names.
 */
export type SubscriptionKey = keyof AllSubscriptions;

/**
 * Helper type to get parameters for a specific subscriber event.
 *
 * @typeParam KeyOfSubscribers - The subscriber event name
 */
export type SubscriptionData<KeyOfSubscribers extends SubscriptionKey> = AllSubscriptions[KeyOfSubscribers];

/**
 * Event map for Bus, compatible with StrictEventEmitter.
 *
 * @internal
 */
export type SubscriptionTuples = {
    [K in SubscriptionKey]: [AllSubscriptions[K]];
};
