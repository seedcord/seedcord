import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Converters, Envapter } from 'envapt';

import { sendFlags } from '#reply/flags';
import { WebhookUrlMetadataKey } from '#src/metadataKeys';

import { ReportThrottle } from '../ReportThrottle';
import { Subscriber } from '../Subscriber';
import { isDiscordWebhookUrl } from './webhookHelpers';
import { WebhookSender } from './WebhookSender';

import type { CoreBase } from '#interfaces/CoreBase';
import type { WebhookFile } from './WebhookSender';
import type { SubscriptionKey } from '../types/Subscriptions';
import type { APIMessageTopLevelComponent } from 'discord-api-types/v10';

/**
 * The content a reporter returns from {@link WebhookLog.report}.
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
 * Declare the url's environment variable with `@WebhookUrl` and implement {@link report}. Url
 * resolution, validation, sender reuse, and sending run in the base. When the variable is unset
 * the reporter is skipped at registration with a boot warning.
 *
 * @typeParam KeyOfSubscribers - The subscription key this reporter receives
 * @typeParam TCore - The transport's Core
 */
export abstract class WebhookLog<KeyOfSubscribers extends SubscriptionKey, TCore extends CoreBase> extends Subscriber<
    KeyOfSubscribers,
    TCore
> {
    private static readonly senders = new Map<string, WebhookSender>();

    /**
     * Builds the message for one published event.
     *
     * @param suppressed - How many events were dropped since the last card
     */
    abstract report(suppressed: number): WebhookReport | Promise<WebhookReport>;

    /**
     * Events sharing this key collapse into one card per minute. Return `null` to send every event.
     */
    protected throttleKey(): string | null {
        return null;
    }

    async execute(): Promise<void> {
        const url = WebhookLog.urlOf(WebhookLog.envKeyOf(this.constructor));
        if (url === null) {
            // only an edge host reaches this branch, since it registers reporters lazily
            this.logger.warn(
                `${paint.sky.bold(this.constructor.name)} has no webhook url set, this reporter is disabled`
            );
            return;
        }

        const key = this.throttleKey();
        const throttle = ReportThrottle.for(this.core);
        const suppressed = key === null ? 0 : throttle.take(key);
        if (suppressed === null) {
            this.logger.debug(`counted a repeat into the next ${paint.sky.bold(this.constructor.name)} card`);
            return;
        }

        try {
            const { username, avatarUrl, components, files } = await this.report(suppressed);
            await WebhookLog.senderFor(url).send({
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

    /** @internal */
    static senderFor(url: string): WebhookSender {
        let sender = WebhookLog.senders.get(url);
        if (!sender) {
            sender = new WebhookSender(url);
            WebhookLog.senders.set(url, sender);
        }
        return sender;
    }

    /** @internal */
    static envKeyOf(ctor: NewableFunction): string {
        const envKey = Reflect.getMetadata(WebhookUrlMetadataKey, ctor) as string | undefined;
        if (!envKey) throw new SeedcordError(SeedcordErrorCode.DecoratorWebhookUrlMissing, [ctor.name]);
        return envKey;
    }

    /** @internal Returns null when the env var is unset, throws when set but malformed. */
    static urlOf(envKey: string): string | null {
        if (!Envapter.has(envKey)) return null;
        const raw = Envapter.getRequired(envKey, Converters.String).trim();
        if (raw === '') return null;
        if (!isDiscordWebhookUrl(raw)) throw new SeedcordError(SeedcordErrorCode.ConfigWebhookUrlInvalid, [envKey]);
        return raw;
    }
}
