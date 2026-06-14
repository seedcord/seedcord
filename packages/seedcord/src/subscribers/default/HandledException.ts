import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { WebhookClient } from 'discord.js';
import { Envapt } from 'envapt';

import { prefixOf } from '@customId/CustomId';
import { BuilderComponent, Denial } from '@interfaces/Components';
import { flagsFor } from '@miscellaneous/flagsFor';

import { isDiscordWebhookUrl, jsonAttachment, WebhookSeparator } from '../bases/webhookHelpers';
import { WebhookLog } from '../bases/WebhookLog';
import { Subscribe } from '../decorators/Subscribe';

import type { AllSubscriptions, FaultSource } from '../types/Subscriptions';

// Reported faults can recur many times a second (a database outage), so one report per window per
// (route + error) keeps the webhook from flooding.
const THROTTLE_WINDOW_MS = 60_000;

function webhookUrlValidator(raw: unknown): string {
    if (raw !== null && typeof raw !== 'string') {
        throw new SeedcordError(SeedcordErrorCode.ConfigHandledExceptionWebhookInvalid);
    }

    const value = raw?.trim() ?? '';
    if (value === '') {
        throw new SeedcordError(SeedcordErrorCode.ConfigHandledExceptionWebhookMissing);
    }

    if (!isDiscordWebhookUrl(value)) {
        throw new SeedcordError(SeedcordErrorCode.ConfigHandledExceptionWebhookInvalid);
    }

    return value;
}

/**
 * Default subscriber that delivers a reported `Denial` (`report: true`) to a webhook with the denial,
 * the interaction source, the threaded uuid, the cause stack, and the raw interaction as a JSON
 * attachment. Identical faults (same route plus error) are throttled to one report per minute.
 *
 * Requires the HANDLED_EXCEPTION_WEBHOOK_URL environment variable, the same rule UNKNOWN_EXCEPTION_WEBHOOK_URL enforces.
 *
 * @throws A {@link SeedcordError} if HANDLED_EXCEPTION_WEBHOOK_URL is not set or is invalid
 */
@Subscribe('handledException')
export class HandledException extends WebhookLog<'handledException'> {
    @Envapt('HANDLED_EXCEPTION_WEBHOOK_URL', {
        converter: (raw) => webhookUrlValidator(raw)
    })
    declare static readonly handledExceptionWebhookUrl: string;

    private static readonly lastReportedAt = new Map<string, number>();

    webhook = new WebhookClient({
        url: HandledException.handledExceptionWebhookUrl
    });

    async execute(): Promise<void> {
        const { source, denial } = this.data;
        const key = faultRouteKey(source, denial);

        const last = HandledException.lastReportedAt.get(key);
        if (last !== undefined && Date.now() - last < THROTTLE_WINDOW_MS) {
            this.logger.debug(`Throttled duplicate handledException for ${denial.name}`);
            return;
        }

        try {
            await this.webhook.send({
                flags: flagsFor(true, false),
                withComponents: true,
                username: 'Handled Exception',
                components: [new HandledExceptionContainer(this.data).component],
                files: [jsonAttachment('source.json', 'The raw source the fault came from', source.raw)]
            });
            // stamp only after a successful send so a transient failure does not suppress the retry
            HandledException.lastReportedAt.set(key, Date.now());
        } catch (error) {
            this.logger.error('Failed to send handled exception webhook', error);
        }
    }
}

/**
 * Throttle key for a fault. Keys on the stable route (the customId prefix, not the full encoded wire)
 * so a parameterized component (a paginator minting one customId per page) collapses to one key.
 *
 * @internal
 */
export function faultRouteKey(source: FaultSource, denial: Denial): string {
    const route =
        source.command ??
        (source.customId !== null ? prefixOf(source.customId) || source.customId : source.interactionKind);
    return `${route}:${denial.name}`;
}

class HandledExceptionContainer extends BuilderComponent<'container'> {
    constructor(data: AllSubscriptions['handledException']) {
        super('container');

        const { denial, uuid, source } = data;

        this.instance
            .addTextDisplayComponents((text) =>
                text.setContent(
                    `### A handled fault was reported: \`${denial.name}\`\n` +
                        `**Message:** ${denial.message}\n` +
                        `**Kind:** ${source.interactionKind}\n` +
                        `**Command:** ${source.command ?? 'n/a'}\n` +
                        `**CustomId:** ${source.customId ?? 'n/a'}\n` +
                        `**User ID:** \`${source.userId}\`\n` +
                        `**Guild ID:** \`${source.guildId ?? 'n/a'}\`\n` +
                        `**Channel ID:** \`${source.channelId ?? 'n/a'}\`\n` +
                        `**Interaction ID:** \`${source.interactionId}\``
                )
            )
            .addSeparatorComponents(new WebhookSeparator().component)
            .addTextDisplayComponents((text) =>
                text.setContent(`### UUID \`${uuid}\`\n\`\`\`${causeStack(denial)}\`\`\``)
            )
            .addSeparatorComponents(new WebhookSeparator().component)
            .addTextDisplayComponents((text) => text.setContent('### Source'))
            .addFileComponents((file) => file.setURL('attachment://source.json'));
    }
}

/**
 * The text shown for a denial's cause in the report. Tolerates a non-serializable cause (a bigint or a
 * circular object) so building the report never throws.
 *
 * @internal
 */
export function causeStack(denial: Denial): string {
    const { cause } = denial;
    if (cause instanceof Error) return cause.stack ?? cause.message;
    if (typeof cause === 'string') return cause;
    if (typeof cause === 'bigint' || typeof cause === 'symbol' || typeof cause === 'function') return cause.toString();
    if (cause !== undefined) {
        try {
            return JSON.stringify(cause);
        } catch {
            return '[unserializable cause]';
        }
    }
    return denial.stack ?? 'No cause recorded.';
}
