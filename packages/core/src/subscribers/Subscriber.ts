import { Logger } from '@seedcord/logger';

import type { SubscriptionKey, AllSubscriptions } from './types/Subscriptions';
import type { CoreBase } from '@interfaces/CoreBase';

/**
 * Abstract base class for handling application subscribers.
 *
 * Provides type-safe access to subscribers data and the core framework instance.
 * Extend this class to create custom subscriber handlers.
 *
 * @typeParam KeyOfSubscribers - The specific subscriber type this handler processes
 * @typeParam TCore - The transport's Core
 */
export abstract class Subscriber<KeyOfSubscribers extends SubscriptionKey, TCore extends CoreBase> {
    protected readonly logger: Logger;

    /**
     * Instantiates the subscriber with event data and core.
     *
     * @param data - The subscriber event data
     * @param core - The core framework instance
     */
    constructor(
        protected readonly data: AllSubscriptions[KeyOfSubscribers],
        protected readonly core: TCore
    ) {
        this.logger = new Logger(this.constructor.name);
    }

    /**
     * Executes the subscriber handler logic.
     */
    abstract execute(): Promise<void>;
}
