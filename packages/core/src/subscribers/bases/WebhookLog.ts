import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { Envapter } from 'envapt';

import { sendFlags } from '#reply/flags';
import { WebhookUrlMetadataKey } from '#src/metadataKeys';
import { ReportThrottle } from '#subscribers/ReportThrottle';
import { Subscriber } from '#subscribers/Subscriber';

import { isDiscordWebhookUrl } from './webhookHelpers';
import { WebhookSender } from './WebhookSender';

import type { CoreBase } from '#interfaces/CoreBase';
import type { WebhookUrl } from '#subscribers/decorators/WebhookUrl';
import type { SubscriptionKey } from '#subscribers/types/Subscriptions';
import type { WebhookFile } from './WebhookSender';
import type { APIMessageTopLevelComponent } from 'discord-api-types/v10';
import type { Promisable } from 'type-fest';

/**
 * The content that a reporter returns from {@link WebhookLog.report}.
 */
export interface WebhookReport {
    /** Shown as the webhook message author. Defaults to the reporter's class name. */
    username?: string;
    /** Shown as the webhook message avatar. Defaults to the webhook's own. */
    avatarUrl?: string;
    components: readonly { toJSON(): APIMessageTopLevelComponent }[];
    files?: readonly WebhookFile[] | undefined;
}

/**
 * Base class for subscribers that deliver their event to a Discord webhook.
 *
 * Declare where the url comes from with `@WebhookUrl` and implement {@link report}. The base
 * resolves the url, validates it, and sends through the bot's REST client. Registration skips a reporter
 * without a url and warns at boot.
 *
 * @typeParam KeyOfSubscribers - The subscription key or keys that this reporter receives, the same ones as `@Subscribe`
 * @typeParam TCore - The transport's Core
 */
export abstract class WebhookLog<KeyOfSubscribers extends SubscriptionKey, TCore extends CoreBase> extends Subscriber<
    KeyOfSubscribers,
    TCore
> {
    /**
     * Builds the message for one published event.
     *
     * @param suppressed - How many events the throttle suppressed since the last card
     */
    abstract report(suppressed: number): Promisable<WebhookReport>;

    /**
     * Events sharing this key collapse into one card per minute. Return `null` to send every event.
     */
    protected throttleKey(): string | null {
        return null;
    }

    async execute(): Promise<void> {
        const target = WebhookLog.targetOf(this.constructor);
        // Bus.probeWebhook skipped every url-less reporter at registration. the url went away since then
        if (target.url === null) {
            this.logger.warn(target.offWarning);
            return;
        }

        const key = this.throttleKey();
        const throttle = ReportThrottle.for(this.core);
        const suppressed = key === null ? 0 : throttle.take(key);
        if (suppressed === null) {
            this.logger.trace(`counted a repeat into the next ${paint.sky.bold(this.constructor.name)} card`);
            return;
        }

        try {
            const { username, avatarUrl, components, files } = await this.report(suppressed);
            await new WebhookSender(this.core.rest, target.url).send({
                flags: sendFlags({ ephemeral: false }),
                username: username ?? this.constructor.name,
                avatarUrl,
                components,
                files
            });
        } catch (error) {
            if (key !== null) throttle.restore(key, suppressed);
            this.logger.error('Webhook report failed', error);
        }
    }

    /** @internal Throws when the url is set but isn't a Discord webhook url. */
    static targetOf(ctor: NewableFunction): WebhookTarget {
        const source = Reflect.getMetadata(WebhookUrlMetadataKey, ctor) as Parameters<typeof WebhookUrl>[0] | undefined;
        if (!source) throw new SeedcordTypeError(SeedcordErrorCode.DecoratorWebhookUrlMissing, [ctor.name]);

        const from =
            typeof source === 'string'
                ? {
                      raw: Envapter.get(source),
                      label: source,
                      unset: `${paint.amber.bold(source)} is not set`,
                      invalid: () =>
                          new SeedcordError(SeedcordErrorCode.ConfigInvalidEnv, [
                              source,
                              "the webhook URL from the channel's Integrations settings"
                          ])
                  }
                : {
                      raw: source(),
                      label: `${ctor.name}'s @WebhookUrl`,
                      unset: 'its @WebhookUrl function returned undefined',
                      invalid: () => new SeedcordTypeError(SeedcordErrorCode.CoreWebhookUrlInvalid, [ctor.name])
                  };

        const url = from.raw?.trim();
        if (!url) return { url: null, offWarning: `${paint.sky.bold(ctor.name)} is off because ${from.unset}` };
        if (!isDiscordWebhookUrl(url)) throw from.invalid();
        return { url, label: from.label };
    }
}

// label is where the url came from, for an error that lists several webhooks
type WebhookTarget = { url: string; label: string } | { url: null; offWarning: string };
