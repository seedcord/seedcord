// the default reporters are decorated at Bus module load, before any entry's own polyfill import runs
import 'reflect-metadata';

import { SubscribeMetadataKey } from '#src/metadataKeys';

import type { CoreBase } from '#interfaces/CoreBase';
import type { Subscriber } from '../Subscriber';
import type { SubscriptionKey } from '../types/Subscriptions';
import type { EventFrequency } from '@seedcord/types';
import type { Constructor } from 'type-fest';

/**
 * Options accepted by the `@Subscribe` decorator.
 */
export interface SubscribeOptions {
    /**
     * Frequency: `'once'` or `'on'`.
     *
     * @defaultValue `'on'`
     */
    readonly frequency?: EventFrequency | undefined;
}

/** @internal */
export interface SubscribeMetadataEntry {
    readonly subscriber: SubscriptionKey;
    readonly frequency?: EventFrequency | undefined;
}

/**
 * Registers a subscriber handler class with a specific subscriber event.
 *
 * Associates the decorated class with a subscriber event type for automatic
 * registration and execution when the subscriber is emitted.
 *
 * @typeParam TSubscriber - The subscriber event name to register for
 * @param subscriber - The subscriber event name to register for
 * @param options - Options to configure the subscriber handler registration.
 * @decorator
 * @example
 * ```typescript
 * \@Subscribe('userJoin')
 * class WelcomeHandler extends Subscriber<'userJoin'> {
 *   async execute() {
 *   }
 * }
 * ```
 * @example
 * ```ts
 * \@Subscribe('userJoin', { frequency: 'once' })
 * // or
 * \@Subscribe('userJoin')
 * ```
 */
export function Subscribe<TSubscriber extends SubscriptionKey>(subscriber: TSubscriber, options?: SubscribeOptions) {
    return function <HandlerCtor extends Constructor<Subscriber<TSubscriber, CoreBase>>>(
        constructor: HandlerCtor
    ): void {
        const meta: SubscribeMetadataEntry = {
            subscriber,
            frequency: options?.frequency
        };

        Reflect.defineMetadata(SubscribeMetadataKey, meta, constructor);
    };
}
