import type { WriteMethod } from '#reply/responseReport';
import type { InteractionKind } from '#src/metadataKeys';
import type { Notice } from '#stops/Notice';
import type { UUID } from '@seedcord/types/internal';
import type { APIApplicationCommand } from 'discord-api-types/v10';
import type { ExcludeStrict } from 'type-fest';

/**
 * How a dispatch finished. The thrown value's type sets this, wherever it was thrown. A `Silence` and a
 * `Notice` with `report` false are `refused`. A `Notice` with `report` true, which includes a default
 * `Fault`, is `failed`, as is any other throw.
 */
export type DispatchOutcome = 'handled' | 'refused' | 'failed';

/**
 * Where a reported fault came from.
 */
export type FaultSource = InteractionFaultSource | EventFaultSource;

/**
 * A fault that came from a discord interaction, JSON-safe for a webhook payload.
 */
export interface InteractionFaultSource {
    readonly kind: 'interaction';
    readonly interactionKind: 'slash' | 'context-menu' | 'button' | 'select' | 'modal';
    /** Slash or context-menu command name, null for component and modal interactions. */
    readonly command: string | null;
    /** Component or modal customId, null for slash and context-menu interactions. */
    readonly customId: string | null;
    readonly userId: string;
    /** Guild the interaction came from, null in DMs. */
    readonly guildId: string | null;
    /** Channel the interaction came from, null when unavailable. */
    readonly channelId: string | null;
    readonly interactionId: string;
    /** The raw interaction, made JSON-safe at serialization with filterCirculars. */
    readonly raw: unknown;
}

/**
 * A fault that came from a client event, JSON-safe for a webhook payload. The actor, guild, and channel
 * are best-effort, derived from the event args. Each is nullable. The raw args carry the full detail.
 */
export interface EventFaultSource {
    readonly kind: 'event';
    readonly eventName: string;
    readonly handler: string;
    readonly userId: string | null;
    /** Null outside a guild. */
    readonly guildId: string | null;
    readonly channelId: string | null;
    /** The raw event args, made JSON-safe at serialization with filterCirculars. */
    readonly raw: unknown;
}

/**
 * The fields both `responseAttempted` shapes carry.
 */
export interface AttemptedWrite {
    /** The dispatch that this write belongs to, for joining against every other key it published. */
    readonly dispatchId: string;
    readonly routeId: string;
    /** The interaction that this write belongs to, for joining against `interactionDispatched`. */
    readonly interactionId: string;
    /** The verb that ran. A `send` reports the verb it routed to. */
    readonly method: WriteMethod;
    readonly durationMs: number;
}

/**
 * A write Discord accepted.
 */
export interface ResponseSent extends AttemptedWrite {
    readonly outcome: 'sent';
    /** Null for every ack-only and choice-only verb. */
    readonly messageId: string | null;
}

/**
 * A write that threw. A non-Error throw arrives wrapped, carrying the thrown value as its `cause`.
 */
export interface ResponseFailed extends AttemptedWrite {
    readonly outcome: 'failed';
    readonly messageId: null;
    readonly error: Error;
}

/**
 * One write through the reply surface. Check `outcome` to reach `error`.
 */
export type ResponseAttempt = ResponseSent | ResponseFailed;

/** Whether a write through the reply surface reached Discord. */
export type ResponseOutcome = ResponseAttempt['outcome'];

/**
 * The framework's own subscription keys. A transport adds a key whose payload type references a type
 * outside this package, through declaration merging on its own module.
 *
 * Every key here is publish-protected. Subscribe to them. The framework is the
 * only publisher.
 */
export interface DefaultSubscriptions {
    /** Triggered when an unhandled exception (a raw non-Notice throw) occurs. */
    readonly unknownException: {
        readonly uuid: UUID;
        /** The dispatch that raised it. Null on a process-level throw, which runs outside any dispatch. */
        readonly dispatchId: string | null;
        readonly error: Error;
        /** Where the throw came from, `slash:ban` for an interaction and `event:name:handler` for an event. */
        readonly origin: string;
        readonly guild?: { readonly id: string; readonly name: string } | undefined;
        readonly user?: { readonly id: string; readonly username: string } | undefined;
        readonly metadata?: unknown;
    };
    /** Triggered when a reported Notice (`report: true`) is caught. */
    readonly handledException: {
        readonly denial: Notice;
        readonly uuid: UUID;
        /** The dispatch that reported it. */
        readonly dispatchId: string;
        /** Where the reported Notice came from, the same shape `unknownException.origin` has. */
        readonly origin: string;
        readonly source: FaultSource;
    };
    /** Triggered when an interaction dispatch throws past the fault boundary. */
    readonly unhandledInteractionError: {
        readonly error: Error;
    };
    /** Triggered once per interaction dispatch, after the handler chain settles. */
    readonly interactionDispatched: {
        /** This dispatch, for joining against every other key it published. */
        readonly dispatchId: string;
        readonly routeId: string;
        /** The interaction this dispatch ran, for joining against `responseAttempted`. */
        readonly interactionId: string;
        readonly kind: `${InteractionKind}`;
        readonly outcome: DispatchOutcome;
        /** True when no route matched and the unhandled default ran. */
        readonly fallback: boolean;
        /** Who ran the route. Null when the payload didn't carry a user. */
        readonly userId: string | null;
        /** Guild the interaction came from, null in DMs. */
        readonly guildId: string | null;
        /** Dispatch entry until the user has a response, replies included. A clock change never affects it. */
        readonly durationMs: number;
        /**
         * Discord's interaction creation until dispatch entry, read from the snowflake. This covers
         * network transit plus any time your bot was busy before starting. A rise points at either
         * Discord or your own backlog. A host running behind Discord reports a negative value
         * because this subtracts a Discord timestamp from the host clock.
         */
        readonly queuedMs: number;
    };
    /**
     * Triggered on every write through the reply surface, several times per interaction. A write that
     * throws reports here too, with `outcome` `failed`. A write that reaches Discord and then returns an
     * unexpected shape publishes nothing, since the callback succeeded and doesn't carry a message to name.
     */
    readonly responseAttempted: ResponseAttempt;
    /** Triggered after each command deploy, including the redeploy after a hot reload. */
    readonly commandsDeployed: {
        readonly global: readonly APIApplicationCommand[];
        /** Keyed by guild id. */
        readonly guilds: Readonly<Record<string, readonly APIApplicationCommand[]>>;
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
export type PublishableKey = ExcludeStrict<SubscriptionKey, keyof DefaultSubscriptions>;

/**
 * The payload type for a subscriber event.
 *
 * @typeParam KeyOfSubscribers - The subscriber event name
 */
export type SubscriptionData<KeyOfSubscribers extends SubscriptionKey> = AllSubscriptions[KeyOfSubscribers];

// one-element tuples because TypedEventEmitter keys on the listener's argument list
export type SubscriptionTuples = {
    [K in SubscriptionKey]: [AllSubscriptions[K]];
};
