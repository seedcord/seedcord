import 'reflect-metadata';

import { WebhookUrlMetadataKey } from '#src/metadataKeys';

import type { CoreBase } from '#interfaces/CoreBase';
import type { WebhookLog } from '#subscribers/bases/WebhookLog';
import type { SubscriptionKey } from '#subscribers/types/Subscriptions';
import type { Constructor } from 'type-fest';

/**
 * Declares where a {@link WebhookLog} reporter reads its webhook url.
 *
 * A string is the name of an environment variable. A function returns the url, which lets you read it from any
 * module of yours. If the variable is unset or the function returns `undefined`, the reporter will be off and the
 * bot will warn at boot. A url that isn't a Discord webhook url throws at boot.
 *
 * @param source - The environment variable that holds the url, or a function that returns it
 * @decorator
 * @example
 * ```ts
 * \@Subscribe(['memberBanned'])
 * \@WebhookUrl('BAN_LOG_WEBHOOK_URL')
 * class BanLog extends WebhookLog<'memberBanned'> {
 *   report() {
 *     return { components: [new BanCard(this.data).component] };
 *   }
 * }
 *
 * // or return it from a settings module of your own
 * \@WebhookUrl(() => settings.banLogWebhook)
 * ```
 */
export function WebhookUrl(source: string | (() => string | undefined)) {
    return function <Keys extends SubscriptionKey>(constructor: Constructor<WebhookLog<Keys, CoreBase>>): void {
        Reflect.defineMetadata(WebhookUrlMetadataKey, source, constructor);
    };
}
