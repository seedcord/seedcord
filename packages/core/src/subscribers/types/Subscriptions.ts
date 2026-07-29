import type { Notice } from '@stops/Notice';
import type { UUID } from 'node:crypto';

/**
 * Where a reported fault came from.
 */
export type FaultSource = InteractionFaultSource | EventFaultSource;

/**
 * A fault that came from a discord interaction, JSON-safe for a webhook payload.
 */
export interface InteractionFaultSource {
    kind: 'interaction';
    interactionKind: 'slash' | 'context-menu' | 'button' | 'select' | 'modal';
    /** Slash or context-menu command name, null for component and modal interactions. */
    command: string | null;
    /** Component or modal customId, null for slash and context-menu interactions. */
    customId: string | null;
    userId: string;
    /** Guild the interaction came from, null in DMs. */
    guildId: string | null;
    /** Channel the interaction came from, null when unavailable. */
    channelId: string | null;
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
    userId: string | null;
    /** Null outside a guild. */
    guildId: string | null;
    channelId: string | null;
    /** The raw event args, made JSON-safe at serialization with filterCirculars. */
    raw: unknown;
}

/** The framework's own subscription keys. */
interface DefaultSubscriptions {
    /** Triggered when an unhandled exception (a raw non-Notice throw) occurs */
    unknownException: {
        uuid: UUID;
        error: Error;
        guild?: { id: string; name: string } | undefined;
        user?: { id: string; username: string } | undefined;
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
 * Custom subscribers defined by the application. Augment it via declaration merging to type your
 * own subscriber payloads.
 *
 * @example
 * ```typescript
 * // the transport package your bot installs, '@seedcord/gateway' or '@seedcord/http'
 * declare module '@seedcord/gateway' {
 *   interface Subscriptions {
 *     'userJoin': { userId: string; guildId: string };
 *     'levelUp': { userId: string; level: number };
 *   }
 * }
 * ```
 */
export interface Subscriptions {}

export interface AllSubscriptions extends DefaultSubscriptions, Subscriptions {}

/** All subscriber event names available to publish and augment. */
export type SubscriptionKey = keyof AllSubscriptions;

/**
 * The payload type for a subscriber event.
 *
 * @typeParam KeyOfSubscribers - The subscriber event name
 */
export type SubscriptionData<KeyOfSubscribers extends SubscriptionKey> = AllSubscriptions[KeyOfSubscribers];

// event map for Bus, compatible with TypedEventEmitter
export type SubscriptionTuples = {
    [K in SubscriptionKey]: [AllSubscriptions[K]];
};
