import { HmrModuleHandler } from '@seedcord/core/hmr';
import { SubscribeMetadataKey } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { traverseDirectory } from '@seedcord/utils';
import chalk from 'chalk';
import { Envapter } from 'envapt';

import { Plugin } from '@interfaces/Plugin';

import { HandledException } from './default/HandledException';
import { UnknownException } from './default/UnknownException';
import { Subscriber } from './Subscriber';

import type { SubscribeMetadataEntry } from './decorators/Subscribe';
import type { AllSubscriptions, SubscriptionKey, SubscriptionTuples } from './types/Subscriptions';
import type { Core } from '@interfaces/Core';
import type { EventFrequency } from '@miscellaneous/types';
import type { HmrUpdateEvent } from '@seedcord/types/internal';

// `data: never` so a concrete subscriber (which takes one subscription's payload) is assignable here
// for storage. The per-key map restores the precise payload type at dispatch.
type SubscriberConstructor = new (data: never, core: Core) => Subscriber<SubscriptionKey>;
interface RegisteredSubscriberHandlerEntry {
    ctor: SubscriberConstructor;
    frequency: EventFrequency;
}

type SubscriberArtifact = SubscriptionKey[];

/**
 * Manages application subscribers and event handling
 *
 * Provides a centralized system for registering and executing custom subscribers
 * throughout the application lifecycle. Bus subscribers are loaded from configured directories
 * and can be triggered programmatically or by framework events. Accessed via `core.bus`. Do not
 * construct it directly.
 */
export class Bus extends Plugin<SubscriptionTuples> {
    public readonly logger = new Logger('Subscribers');
    /** @internal */
    public override readonly name = 'Subscribers';
    private isInitialized = false;
    private readonly subscribersMap = new Map<SubscriptionKey, RegisteredSubscriberHandlerEntry[]>();
    private readonly executedOnceHandlers = new Set<SubscriberConstructor>();
    private readonly hmrHandler?: HmrModuleHandler<SubscriberConstructor, void, SubscriberArtifact>;

    constructor(protected core: Core) {
        super(core);

        if (this.core.config.subscribers.path) {
            if (!Envapter.isDevelopment && !Envapter.isTest) return;
            this.hmrHandler = new HmrModuleHandler({
                handlersDir: this.core.config.subscribers.path,
                isHandler: this.isSubscriber.bind(this),
                registerHandler: this.registerSubscriber.bind(this),
                unregisterHandler: this.unregisterSubscriber.bind(this),
                getArtifacts: this.getArtifacts.bind(this),
                logger: this.logger
            });
        }
    }

    private getArtifacts(ctor: SubscriberConstructor): SubscriberArtifact {
        const meta = Reflect.getMetadata(SubscribeMetadataKey, ctor) as SubscribeMetadataEntry;
        return [meta.subscriber];
    }

    /** @internal */
    public async init(): Promise<void> {
        if (this.isInitialized) return;

        this.isInitialized = true;

        this.registerSubscriber(UnknownException);
        this.registerSubscriber(HandledException);

        // require both webhook urls at boot so a missing one stops the boot, never silently dropping fault
        // reports when the first exception fires.
        Envapter.require('UNKNOWN_EXCEPTION_WEBHOOK_URL', 'HANDLED_EXCEPTION_WEBHOOK_URL');

        const subscribersDir = this.core.config.subscribers.path;
        if (subscribersDir) {
            this.logger.info(chalk.bold(subscribersDir));
            await this.loadSubscribers(subscribersDir);
            const totalSubscribers = [...this.subscribersMap.values()].reduce(
                (acc, handlers) => acc + handlers.length,
                0
            );
            this.logger.utils.list([`${chalk.bold.magenta(totalSubscribers)} subscribers`], chalk.bold.green('Loaded'));
        }
    }

    /** @internal For use in dev mode */
    public override async onHmr(event: HmrUpdateEvent): Promise<void> {
        if (this.hmrHandler) {
            await this.hmrHandler.handle(event);
        }
    }

    private async loadSubscribers(dir: string): Promise<void> {
        await traverseDirectory(
            dir,
            (fullPath, relativePath, imported) => {
                for (const exportName of Object.keys(imported)) {
                    const val = imported[exportName];
                    if (this.isSubscriber(val)) {
                        this.registerSubscriber(val);
                        this.hmrHandler?.trackHandler(fullPath, val);
                        this.logger.utils.registration(val.name, relativePath);
                    }
                }
            },
            this.logger
        );
    }

    private registerSubscriber(handler: SubscriberConstructor): void {
        const options = Reflect.getMetadata(SubscribeMetadataKey, handler) as SubscribeMetadataEntry;

        let handlers = this.subscribersMap.get(options.subscriber);
        if (!handlers) {
            handlers = [];
            this.subscribersMap.set(options.subscriber, handlers);
        }
        handlers.push({ ctor: handler, frequency: options.frequency ?? 'on' });
    }

    private unregisterSubscriber(handler: SubscriberConstructor, artifacts?: SubscriberArtifact): void {
        const subscribers = artifacts ?? [...this.subscribersMap.keys()];
        for (const subscriber of subscribers) {
            const handlers = this.subscribersMap.get(subscriber);
            if (!handlers) continue;
            const index = handlers.findIndex((entry) => entry.ctor === handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
        // spent follows the ctor identity, so leaving executedOnceHandlers alone keeps a rollback-restored subscriber spent
    }

    private isSubscriber(obj: unknown): obj is SubscriberConstructor {
        if (typeof obj !== 'function') return false;
        return obj.prototype instanceof Subscriber && Reflect.hasMetadata(SubscribeMetadataKey, obj);
    }

    /**
     * Publishes an event to its subscribers and native listeners.
     *
     * Fire-and-forget, so subscriber handlers run asynchronously and this returns before they
     * complete, and callers must not assume side effects have landed. Errors thrown by a subscriber
     * are caught and logged, never surfaced here. A `'once'` subscriber is marked as executed when
     * it starts (even if it throws), so it never runs twice.
     *
     * @param event - The subscription key to publish
     * @param data - Payload passed to each subscriber
     * @returns Whether the underlying emitter had native listeners for the event
     */
    public publish<KeyOfSubscribers extends SubscriptionKey>(
        event: KeyOfSubscribers,
        data: AllSubscriptions[KeyOfSubscribers]
    ): boolean {
        void this.processSubscriber(event, data);
        // justified: a generic key can't reduce SubscriptionTuples[K], but data is this event's payload by the signature
        return super.emit(event, ...([data] as SubscriptionTuples[KeyOfSubscribers]));
    }

    private async processSubscriber<KeyOfSubscribers extends SubscriptionKey>(
        subscriberName: KeyOfSubscribers,
        data: AllSubscriptions[KeyOfSubscribers]
    ): Promise<void> {
        const handlers = this.subscribersMap.get(subscriberName);
        if (!handlers) return;

        for (const entry of handlers) {
            if (entry.frequency === 'once' && this.executedOnceHandlers.has(entry.ctor)) {
                continue;
            }

            try {
                // Mark before awaiting so a re-entrant publish of the same event can't run a
                // 'once' subscriber twice while the first invocation is still pending.
                if (entry.frequency === 'once') {
                    this.executedOnceHandlers.add(entry.ctor);
                }

                // the map keys each subscriber to one subscription, so data matches this ctor's payload arm
                const Ctor = entry.ctor as new (
                    data: AllSubscriptions[KeyOfSubscribers],
                    core: Core
                ) => Subscriber<KeyOfSubscribers>;
                const instance = new Ctor(data, this.core);
                await instance.execute();
            } catch (err) {
                this.logger.error(`Error in subscriber ${String(subscriberName)} handler ${entry.ctor.name}:`, err);
            }
        }
    }
}
