import { Subscriber as CoreSubscriber, WebhookLog as CoreWebhookLog } from '@seedcord/core';

import type { Core } from '@interfaces/Core';
import type { SubscriptionKey } from '@seedcord/core';

/**
 * Base class for an HTTP subscriber, binding `this.core` to the HTTP {@link Core}.
 *
 * @typeParam KeyOfSubscribers - The subscription key this handler receives
 */
export abstract class Subscriber<KeyOfSubscribers extends SubscriptionKey> extends CoreSubscriber<
    KeyOfSubscribers,
    Core
> {}

/**
 * Base class for an HTTP subscriber that delivers its event to a Discord webhook, binding
 * `this.core` to the HTTP {@link Core}.
 *
 * @typeParam KeyOfSubscribers - The subscription key this reporter receives
 */
export abstract class WebhookLog<KeyOfSubscribers extends SubscriptionKey> extends CoreWebhookLog<
    KeyOfSubscribers,
    Core
> {}
