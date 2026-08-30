import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { TypedEventEmitter } from '@seedcord/event-emitter';
import { Logger } from '@seedcord/logger';

import { SubscribeMetadataKey } from '#src/metadataKeys';

import { WebhookLog } from './bases/WebhookLog';
import { HandledException } from './default/HandledException';
import { UnknownException } from './default/UnknownException';
import { PublishDefault } from './publishDefault';
import { RegisterDefaults, RegisteredCount, RegisterSubscriber, UnregisterSubscriber, VerifyWebhooks } from './slots';

import type { CoreBase } from '#interfaces/CoreBase';
import type { SubscribeMetadataEntry } from './decorators/Subscribe';
import type { Subscriber } from './Subscriber';
import type {
    AllSubscriptions,
    DefaultSubscriptions,
    PublishableKey,
    SubscriptionKey,
    SubscriptionTuples
} from './types/Subscriptions';
import type { EventFrequency } from '@seedcord/types';

/**
 * Both parameters are `never` because construct-signature parameters check contravariantly, and a
 * concrete subscriber narrows each to its own payload and transport `Core`. One cast at dispatch
 * restores both.
 *
 * @internal
 */
export type StoredSubscriberCtor = new (data: never, core: never) => Subscriber<SubscriptionKey, CoreBase>;

/**
 * `resolve` is lazy so an edge host registers from a manifest row without importing the module
 * until that key first publishes.
 *
 * @internal
 */
export interface SubscriberRegistration {
    readonly keys: readonly SubscriptionKey[];
    readonly frequency: EventFrequency;
    readonly resolve: () => StoredSubscriberCtor | Promise<StoredSubscriberCtor>;
    /** A server-host registration carries it from the start. A lazy one fills it on first resolve. */
    ctor?: StoredSubscriberCtor | undefined;
}

const loggerSlot = Symbol('seedcord:bus:logger');

/**
 * Registers and dispatches subscribers. Subscribers run on a programmatic or framework publish.
 * Accessed via `core.bus`. Do not construct it directly.
 */
export class Bus extends TypedEventEmitter<SubscriptionTuples> {
    private readonly logger = new Logger('Subscribers', { channel: 'subscribers' });

    /** @internal */
    readonly [loggerSlot]: Logger = this.logger;

    private readonly subscribersMap = new Map<SubscriptionKey, SubscriberRegistration[]>();
    private readonly executedOnce = new Set<SubscriberRegistration>();
    // url -> env keys, filled as reporters register and read once by verifyWebhooks
    private readonly webhookProbes = new Map<string, string[]>();

    constructor(protected core: CoreBase) {
        super();
    }

    /** @internal keep this inside start(). a bad webhook url thrown outside it never resets the singleton guard */
    public [RegisterDefaults](): void {
        this[RegisterSubscriber](registrationFor(UnknownException));
        this[RegisterSubscriber](registrationFor(HandledException));
    }

    /** @internal */
    public [RegisterSubscriber](registration: SubscriberRegistration): void {
        // a url-less reporter never registers. a publish on its key reaches nothing
        if (registration.ctor && !this.probeWebhook(registration.ctor)) return;

        for (const key of registration.keys) {
            let registrations = this.subscribersMap.get(key);
            if (!registrations) {
                registrations = [];
                this.subscribersMap.set(key, registrations);
            }
            registrations.push(registration);
        }
    }

    /** @internal */
    public [UnregisterSubscriber](ctor: StoredSubscriberCtor, keys?: readonly SubscriptionKey[]): void {
        for (const key of keys ?? [...this.subscribersMap.keys()]) {
            const registrations = this.subscribersMap.get(key);
            if (!registrations) continue;
            const index = registrations.findIndex((entry) => entry.ctor === ctor);
            if (index !== -1) registrations.splice(index, 1);
        }
        // the once state hangs off the registration identity, which is why a restored subscriber runs again
    }

    /** @internal */
    public get [RegisteredCount](): number {
        return [...this.subscribersMap.values()].reduce((total, entries) => total + entries.length, 0);
    }

    /** @internal a lazy edge registration never probes. every server-host reporter registers eagerly */
    public async [VerifyWebhooks](): Promise<void> {
        const missing: string[] = [];
        await Promise.all(
            [...this.webhookProbes].map(async ([url, envKeys]) => {
                const result = await WebhookLog.senderFor(url).verify();
                if (result === 'missing') missing.push(...envKeys);
                else if (result === 'unreachable')
                    this.logger.warn(
                        `could not verify webhook at ${envKeys.map((key) => paint.amber.bold(key)).join(', ')}`
                    );
            })
        );
        // collected first so the first boot names every missing webhook at once
        if (missing.length > 0) throw new SeedcordError(SeedcordErrorCode.ConfigWebhookNotFound, [missing.join(', ')]);
    }

    // true means the class registers
    private probeWebhook(ctor: StoredSubscriberCtor): boolean {
        if (!(ctor.prototype instanceof WebhookLog)) return true;

        const envKey = WebhookLog.envKeyOf(ctor);
        const url = WebhookLog.urlOf(envKey);
        if (url === null) {
            this.logger.warn(`${paint.sky.bold(ctor.name)} disabled, ${paint.amber.bold(envKey)} is not set`);
            return false;
        }
        const envKeys = this.webhookProbes.get(url) ?? [];
        if (!envKeys.includes(envKey)) envKeys.push(envKey);
        this.webhookProbes.set(url, envKeys);
        return true;
    }

    /**
     * Publishes an event to its subscribers and native listeners.
     *
     * Fire-and-forget. Subscriber handlers run asynchronously and this returns before they finish. A
     * caller cannot assume a side effect has completed. Errors thrown by a subscriber or by an `on()`
     * listener are caught and logged, never surfaced here. One throwing listener does not stop the
     * others. Subscribers on one key run concurrently and carry no ordering guarantee. A `'once'`
     * subscriber is marked as executed when it starts, even if it throws. It never runs twice.
     *
     * The framework's own keys are excluded. Subscribe to those and listen with `on`. The framework
     * is their only publisher.
     *
     * @param event - The subscription key to publish
     * @param data - Payload passed to each subscriber
     * @returns Whether the underlying emitter had native listeners for the event
     */
    public publish<KeyOfSubscribers extends PublishableKey>(
        event: KeyOfSubscribers,
        data: AllSubscriptions[KeyOfSubscribers]
    ): boolean {
        return this.dispatchKey(event, data);
    }

    /**
     * @deprecated Call {@link Bus.publish} to reach subscribers and listeners together.
     * @throws A **SeedcordTypeError** always. `emit` reaches only the `on()` listeners.
     */
    public override emit<KeyOfSubscribers extends SubscriptionKey>(
        event: KeyOfSubscribers,
        ..._args: SubscriptionTuples[KeyOfSubscribers]
    ): never {
        throw new SeedcordTypeError(SeedcordErrorCode.CoreBusEmitUnavailable, [String(event)]);
    }

    /** @internal the framework's own publish path, keyed by a symbol no public entry exports */
    public [PublishDefault]<KeyOfSubscribers extends keyof DefaultSubscriptions>(
        event: KeyOfSubscribers,
        data: AllSubscriptions[KeyOfSubscribers]
    ): boolean {
        return this.dispatchKey(event, data);
    }

    private dispatchKey<KeyOfSubscribers extends SubscriptionKey>(
        event: KeyOfSubscribers,
        data: AllSubscriptions[KeyOfSubscribers]
    ): boolean {
        void this.processSubscriber(event, data);
        // justified: a generic key can't reduce SubscriptionTuples[K], but data is this event's payload by the signature
        return this.emitSafe(event, ...([data] as SubscriptionTuples[KeyOfSubscribers]));
    }

    protected override onListenerError(error: unknown, event: string | symbol): void {
        this.logger.error(`listener for ${String(event)} threw`, error);
    }

    private async processSubscriber<KeyOfSubscribers extends SubscriptionKey>(
        subscriberName: KeyOfSubscribers,
        data: AllSubscriptions[KeyOfSubscribers]
    ): Promise<void> {
        const registrations = this.subscribersMap.get(subscriberName);
        if (!registrations) return;

        const pending = registrations.reduce<Promise<void>[]>((acc, entry) => {
            if (entry.frequency === 'once') {
                if (this.executedOnce.has(entry)) return acc;
                // mark before awaiting, so a re-entrant publish can't run a 'once' subscriber twice mid-flight
                this.executedOnce.add(entry);
            }
            acc.push(this.runSubscriber(entry, subscriberName, data));
            return acc;
        }, []);

        await Promise.allSettled(pending);
    }

    private async runSubscriber<KeyOfSubscribers extends SubscriptionKey>(
        entry: SubscriberRegistration,
        subscriberName: KeyOfSubscribers,
        data: AllSubscriptions[KeyOfSubscribers]
    ): Promise<void> {
        // named outside the try so the catch can say which subscriber threw. several run per key
        let name = '<unresolved>';
        try {
            entry.ctor ??= await entry.resolve();
            // the registration keys each subscriber to its subscriptions, so data matches this ctor's payload arm
            const Ctor = entry.ctor as new (
                data: AllSubscriptions[KeyOfSubscribers],
                core: CoreBase
            ) => Subscriber<KeyOfSubscribers, CoreBase>;
            name = Ctor.name;
            await new Ctor(data, this.core).execute();
        } catch (err) {
            this.logger.error(
                `Error in subscriber ${paint.mute(String(subscriberName))} handler ${paint.sky.bold(name)}:`,
                err
            );
        }
    }
}

// every caller has already gated on the Subscribe metadata being there
/** @internal */
export function registrationFor(ctor: StoredSubscriberCtor): SubscriberRegistration {
    const meta = Reflect.getMetadata(SubscribeMetadataKey, ctor) as SubscribeMetadataEntry;
    return { keys: [meta.subscriber], frequency: meta.frequency ?? 'on', resolve: () => ctor, ctor };
}

/** @internal */
export function busLoggerOf(bus: Bus): Logger {
    return bus[loggerSlot];
}
