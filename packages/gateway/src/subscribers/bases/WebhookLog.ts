import { WebhookUrlMetadataKey } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import chalk from 'chalk';
import { Converters, Envapter } from 'envapt';

import { flagsFor } from '@miscellaneous/flagsFor';

import { Subscriber } from '../Subscriber';
import { isDiscordWebhookUrl } from './webhookHelpers';
import { WebhookSender } from './WebhookSender';

import type { WebhookFile } from './WebhookSender';
import type { SubscriptionKey } from '../types/Subscriptions';
import type { APIMessageTopLevelComponent } from 'discord-api-types/v10';

/**
 * The content a reporter returns from {@link WebhookLog.report}.
 */
export interface WebhookReport {
    /** Shown as the webhook message author. Defaults to the reporter's class name. */
    username?: string;
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
 */
export abstract class WebhookLog<KeyOfSubscribers extends SubscriptionKey> extends Subscriber<KeyOfSubscribers> {
    private static readonly senders = new Map<string, WebhookSender>();

    /** Builds the message for one published event. */
    abstract report(): WebhookReport | Promise<WebhookReport>;

    async execute(): Promise<void> {
        const url = WebhookLog.urlOf(WebhookLog.envKeyOf(this.constructor));
        if (url === null) {
            // unreachable through the Bus, registration already skips url-less reporters
            this.logger.warn(`${chalk.bold(this.constructor.name)} has no webhook url set, this reporter is disabled`);
            return;
        }

        const { username, components, files } = await this.report();
        try {
            await WebhookLog.senderFor(url).send({
                flags: flagsFor(false),
                username: username ?? this.constructor.name,
                components,
                files
            });
        } catch (error) {
            this.logger.error('Failed to send webhook report', error);
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
