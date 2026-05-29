import type { Subscriber } from '../Subscriber';
import type { SubscriptionKey } from '../types/Subscriptions';
import type { EventFrequency } from '@miscellaneous/types';
import type { Constructor } from 'type-fest';

/**
 * Metadata key used to store subscriber handler information
 *
 * @internal
 */
export const SubscribeMetadataKey = Symbol('subscribe:metadata');

/**
 * Options accepted by the `@Subscribe` decorator.
 */
export interface SubscribeOptions {
    /** Frequency: `'once'` or `'on'`. Defaults to `'on'`. */
    readonly frequency?: EventFrequency | undefined;
}

/**
 * Metadata entry representing a registered subscriber handler.
 *
 * @internal
 */
export interface SubscribeMetadataEntry {
    /** The subscriber event name to register for. */
    readonly subscriber: SubscriptionKey;
    /** Frequency: `'once'` or `'on'`. Defaults to `'on'`. */
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
 *     // Handle user join event
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
    return function <HandlerCtor extends Constructor<Subscriber<TSubscriber>>>(constructor: HandlerCtor): void {
        const meta: SubscribeMetadataEntry = {
            subscriber,
            frequency: options?.frequency
        };

        Reflect.defineMetadata(SubscribeMetadataKey, meta, constructor);
    };
}
