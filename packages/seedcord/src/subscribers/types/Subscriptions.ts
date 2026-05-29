import type { Nullable } from '@seedcord/types';
import type { UUID } from 'crypto';
import type { Guild, User } from 'discord.js';

/**
 * Default subscribers that are always available in the framework.
 */
export interface DefaultSubscriptions {
    /** Triggered when an unhandled exception occurs */
    unknownException: {
        uuid: UUID;
        error: Error;
        guild: Nullable<Guild>;
        user: Nullable<User>;
        metadata?: unknown;
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
