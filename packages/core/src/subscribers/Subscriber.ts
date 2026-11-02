import { Logger } from '@seedcord/logger';

import { caseFor } from '#src/handlers/caseFor';

import type { CoreBase } from '#interfaces/CoreBase';
import type { SubscriptionKey, AllSubscriptions } from './types/Subscriptions';
import type { IsUnion, Promisable } from 'type-fest';

type SubscriberMatchCases<Keys extends SubscriptionKey, Ret> = {
    [Key in Keys]: (data: AllSubscriptions[Key]) => Promisable<Ret>;
};

type SingleKeyData<Keys extends SubscriptionKey> = IsUnion<Keys> extends true ? never : AllSubscriptions[Keys];

/**
 * Abstract base class for handling application subscribers.
 *
 * Pass the subscription key(s) as the generic, the same one(s) as `@Subscribe`. On a single-key subscriber, read
 * `this.data` directly. On a subscriber for several keys, branch with `this.match`, keyed by subscription key.
 *
 * @typeParam Keys - One or more subscription keys, like `'userJoin'` or `'userJoin' | 'userLeave'`.
 * @typeParam TCore - The transport's Core
 */
export abstract class Subscriber<in out Keys extends SubscriptionKey, TCore extends CoreBase> {
    protected readonly logger: Logger;
    readonly #payload: AllSubscriptions[Keys];

    /**
     * Instantiates the subscriber with event data and core.
     *
     * @param payload - The published payload
     * @param core - The core framework instance
     * @param key - The published key
     */
    constructor(
        payload: AllSubscriptions[Keys],
        protected readonly core: TCore,
        protected readonly key: Keys
    ) {
        this.#payload = payload;
        this.logger = new Logger(this.constructor.name, { channel: 'subscribers' });
    }

    /** The published payload. It's `never` on a subscriber for several keys, where `this.match` reads it. */
    protected get data(): SingleKeyData<Keys> {
        return this.#payload;
    }

    /**
     * Executes the subscriber handler logic.
     */
    abstract execute(): Promise<void>;

    /**
     * Run the case for the published key. Use this only when the subscriber is registered for several
     * keys. On a single-key subscriber, read `this.data` directly.
     *
     * Provide one case per registered key. Each case receives that key's own payload. A missing key or an unknown
     * key is a compile error.
     *
     * @throws A **SeedcordTypeError** with `MatchCaseMissing` when the published key doesn't have a case.
     *
     * @example
     * ```ts
     * import { Subscribe, Subscriber } from '@seedcord/gateway';
     *
     * \@Subscribe(['interactionDispatched'], ['eventDispatched'])
     * class Metrics extends Subscriber<'interactionDispatched' | 'eventDispatched'> {
     *     async execute() {
     *         await this.match({
     *             interactionDispatched: (data) => this.logger.info(data.routeId),
     *             eventDispatched: (data) => this.logger.info(data.name)
     *         });
     *     }
     * }
     * ```
     */
    protected async match<Ret>(cases: SubscriberMatchCases<Keys, Ret>): Promise<Ret> {
        return await caseFor(this, cases, 'subscription key', this.key)(this.#payload);
    }
}
