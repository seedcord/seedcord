import 'reflect-metadata';

import { WebhookUrlMetadataKey } from '#src/metadataKeys';

import type { CoreBase } from '#interfaces/CoreBase';
import type { WebhookLog } from '../bases/WebhookLog';
import type { SubscriptionKey } from '../types/Subscriptions';
import type { Constructor } from 'type-fest';

/**
 * Declares the environment variable a {@link WebhookLog} reporter reads its webhook url from.
 *
 * An unset variable disables the reporter with a boot warning. A set but malformed value throws
 * at boot.
 *
 * @param envKey - The environment variable name holding the webhook url
 * @decorator
 * @example
 * ```ts
 * \@Subscribe('memberBanned')
 * \@WebhookUrl('BAN_LOG_WEBHOOK_URL')
 * class BanLog extends WebhookLog<'memberBanned'> {
 *   report() {
 *     return { components: [new BanCard(this.data).component] };
 *   }
 * }
 * ```
 */
export function WebhookUrl(envKey: string) {
    return function <HandlerCtor extends Constructor<WebhookLog<SubscriptionKey, CoreBase>>>(
        constructor: HandlerCtor
    ): void {
        Reflect.defineMetadata(WebhookUrlMetadataKey, envKey, constructor);
    };
}
