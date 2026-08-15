import type { WriteMethod } from '#reply/responseReport';
import type { InteractionRoutes } from '#src/metadataKeys';
import type { Notice } from '#stops/Notice';
import type { TypedExclude } from '@seedcord/types';
import type { UUID } from 'node:crypto';

/**
 * How a dispatch finished. The thrown value's type sets this, wherever it was thrown. A `Silence` and a
 * `Notice` with `report` false are `refused`. A `Notice` with `report` true, which includes a default
 * `Fault`, is `failed`, as is any other throw.
 */
export type DispatchOutcome = 'handled' | 'refused' | 'failed';

/** Whether a write through the reply surface reached Discord. */
export type ResponseOutcome = 'sent' | 'failed';

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
 * are best-effort, derived from the event args. Each is nullable. The raw args carry the full detail.
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

/**
 * The framework's own subscription keys. A transport adds a key whose payload type references a type
 * outside this package, through declaration merging on its own module.
 *
 * Every key here is publish-protected. Subscribe to them. The framework is the
 * only publisher.
 */
export interface DefaultSubscriptions {
    /** Triggered when an unhandled exception (a raw non-Notice throw) occurs. */
    unknownException: {
        uuid: UUID;
        error: Error;
        /** Where the throw came from, `slash:ban` for an interaction and `event:name:handler` for an event. */
        routeId: string;
        guild?: { id: string; name: string } | undefined;
        user?: { id: string; username: string } | undefined;
        metadata?: unknown;
    };
    /** Triggered when a reported Notice (`report: true`) is caught. */
    handledException: {
        denial: Notice;
        uuid: UUID;
        /** The same id `interactionDispatched` publishes. An event reads `event:name:handler`. */
        routeId: string;
        source: FaultSource;
    };
    /** Triggered when an interaction dispatch throws past the fault boundary. */
    unhandledInteractionError: {
        error: Error;
    };
    /** Triggered once per interaction dispatch, after the handler chain settles. */
    interactionDispatched: {
        routeId: string;
        /** The interaction this dispatch ran, for joining against `responseAttempted`. */
        interactionId: string;
        kind: `${InteractionRoutes}`;
        outcome: DispatchOutcome;
        /** True when no route matched and the unhandled default ran. */
        fallback: boolean;
        /** Dispatch entry until the user has a response, replies included. A clock change never affects it. */
        durationMs: number;
        /**
         * Discord's interaction creation until dispatch entry, read from the snowflake. This covers
         * network transit plus any time your bot was busy before starting. A rise points at either
         * Discord or your own backlog. It subtracts a Discord timestamp from the host clock, so a host
         * running behind Discord reports a negative value.
         */
        queuedMs: number;
    };
    /**
     * Triggered on every write through the reply surface, several times per interaction. A write that
     * throws reports here too, with `outcome` `failed`. A write that reaches Discord and then returns an
     * unexpected shape publishes nothing, since the callback succeeded and carries no message to name.
     */
    responseAttempted: {
        routeId: string;
        /** The interaction this write belongs to, for joining against `interactionDispatched`. */
        interactionId: string;
        /** `send` routes to another verb, so it reports the verb that ran. */
        method: WriteMethod;
        outcome: ResponseOutcome;
        durationMs: number;
        /** Null for every ack-only or choice-only verb, and for a failed write. */
        messageId: string | null;
        /** Present when `outcome` is `failed`. */
        error?: Error;
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

/** All subscriber event names available to subscribe to and augment. */
export type SubscriptionKey = keyof AllSubscriptions;

/**
 * The keys `publish` accepts. The framework's own keys are excluded, since only the framework
 * produces them.
 */
export type PublishableKey = TypedExclude<SubscriptionKey, keyof DefaultSubscriptions>;

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
