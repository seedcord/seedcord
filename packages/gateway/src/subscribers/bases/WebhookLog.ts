import { Subscriber } from '../Subscriber';

import type { SubscriptionKey, AllSubscriptions } from '../types/Subscriptions';
import type { Core } from '@interfaces/Core';
import type { WebhookClient } from 'discord.js';

/**
 * Abstract webhook logging handler for subscriber events.
 *
 * Extends Subscriber to provide webhook-based logging capabilities.
 * Implementations must define the webhook client to send messages to by implementing the webhook property.
 *
 * @typeParam KeyOfSubscribers - The specific subscriber type this handler processes
 */
export abstract class WebhookLog<KeyOfSubscribers extends SubscriptionKey> extends Subscriber<KeyOfSubscribers> {
    /** The Discord webhook client for sending log messages */
    abstract webhook: WebhookClient;

    constructor(data: AllSubscriptions[KeyOfSubscribers], core: Core) {
        super(data, core);
    }
}
