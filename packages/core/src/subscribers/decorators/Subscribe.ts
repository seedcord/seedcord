// the default reporters are decorated at Bus module load, before any entry's own polyfill import runs
import 'reflect-metadata';

import { assertUniqueKeys } from '#src/decorators/assertUniqueKeys';
import { SubscribeMetadataKey } from '#src/metadataKeys';

import type { CoreBase } from '#interfaces/CoreBase';
import type { Subscriber } from '#subscribers/Subscriber';
import type { SubscriptionKey } from '#subscribers/types/Subscriptions';
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

type SubscribeSpec<Key extends SubscriptionKey> = readonly [key: Key, options?: SubscribeOptions];

/** @internal */
export interface SubscribeMetadataEntry {
    readonly key: SubscriptionKey;
    readonly frequency: EventFrequency;
}

/**
 * Registers a subscriber class with one or more subscription keys.
 *
 * Supply one `[key, options?]` tuple per key. The subscriber's generic must list the same keys.
 *
 * @decorator
 * @example
 * ```ts
 * \@Subscribe(['userJoin'])
 * class WelcomeHandler extends Subscriber<'userJoin'> {
 *     async execute() {
 *         this.logger.info(`${this.data.userId} joined`);
 *     }
 * }
 * ```
 * @example
 * ```ts
 * \@Subscribe(['userJoin', { frequency: 'once' }], ['userLeave'])
 * class Presence extends Subscriber<'userJoin' | 'userLeave'> {
 *     async execute() {
 *         await this.match({
 *             userJoin: (data) => this.logger.info(`${data.userId} joined`),
 *             userLeave: (data) => this.logger.info(`${data.userId} left`)
 *         });
 *     }
 * }
 * ```
 */
export function Subscribe<const Defs extends readonly SubscribeSpec<SubscriptionKey>[]>(...defs: Defs) {
    type Key = Defs[number][0];

    // an invariant key generic on Subscriber makes this reject a mismatch in either direction
    return function <HandlerCtor extends Constructor<Subscriber<Key, CoreBase>>>(constructor: HandlerCtor): void {
        const entries = defs.map<SubscribeMetadataEntry>(([key, options]) => ({
            key,
            frequency: options?.frequency ?? 'on'
        }));
        assertUniqueKeys(
            '@Subscribe',
            constructor,
            entries.map((entry) => entry.key)
        );
        Reflect.defineMetadata(SubscribeMetadataKey, entries, constructor);
    };
}
