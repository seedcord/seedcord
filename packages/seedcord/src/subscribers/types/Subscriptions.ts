import type { Denial } from '@interfaces/Components';
import type { Nullable } from '@seedcord/types';
import type { UUID } from 'crypto';
import type { Guild, User } from 'discord.js';

/**
 * Where a reported fault came from. A union over `kind`. Add a new source as a new arm, never widen an
 * existing one, or you break consumers narrowing on `kind`. Only the interaction arm exists today.
 */
export type FaultSource = InteractionFaultSource;

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
 * Default subscribers that are always available in the framework.
 */
export interface DefaultSubscriptions {
    /** Triggered when an unhandled exception (a raw non-Denial throw) occurs */
    unknownException: {
        uuid: UUID;
        error: Error;
        guild: Nullable<Guild>;
        user: Nullable<User>;
        metadata?: unknown;
    };
    /** Triggered when a reported Denial (`report: true`) is caught */
    handledException: {
        /** The live denial, typed so a subscriber reads subclass fields with no cast. */
        denial: Denial;
        /** The same uuid the user-facing render shows. */
        uuid: UUID;
        /** Where the fault came from, narrow on `source.kind`. */
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
