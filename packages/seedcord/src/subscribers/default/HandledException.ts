import { BuilderComponent, Notice } from '@seedcord/core';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { WebhookClient } from 'discord.js';
import { Envapt } from 'envapt';

import { flagsFor } from '@miscellaneous/flagsFor';

import { isDiscordWebhookUrl, jsonAttachment, WebhookSeparator } from '../bases/webhookHelpers';
import { WebhookLog } from '../bases/WebhookLog';
import { Subscribe } from '../decorators/Subscribe';

import type { AllSubscriptions, FaultSource } from '../types/Subscriptions';

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
 * Default subscriber that delivers a reported `Notice` (`report: true`) to a webhook with the denial,
 * the fault source, the threaded uuid, the cause stack, and the raw source as a JSON attachment. The
 * controller boundary throttles identical faults before they reach the bus.
 *
 * Requires the HANDLED_EXCEPTION_WEBHOOK_URL environment variable, the same rule UNKNOWN_EXCEPTION_WEBHOOK_URL enforces.
 *
 * @throws A **SeedcordError** if HANDLED_EXCEPTION_WEBHOOK_URL is not set or is invalid
 */
@Subscribe('handledException')
export class HandledException extends WebhookLog<'handledException'> {
    @Envapt('HANDLED_EXCEPTION_WEBHOOK_URL', {
        converter: (raw) => webhookUrlValidator(raw)
    })
    declare static readonly handledExceptionWebhookUrl: string;

    webhook = new WebhookClient({
        url: HandledException.handledExceptionWebhookUrl
    });

    async execute(): Promise<void> {
        const { source } = this.data;

        try {
            await this.webhook.send({
                flags: flagsFor(false),
                withComponents: true,
                username: 'Handled Exception',
                components: [new HandledExceptionContainer(this.data).component],
                files: [jsonAttachment('source.json', 'The raw source the fault came from', source.raw)]
            });
        } catch (error) {
            this.logger.error('Failed to send handled exception webhook', error);
        }
    }
}

class HandledExceptionContainer extends BuilderComponent<'container'> {
    constructor(data: AllSubscriptions['handledException']) {
        super('container');

        const { denial, uuid, source } = data;

        this.instance
            .addTextDisplayComponents((text) => text.setContent(faultSummary(denial, source)))
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
 * The summary block of a fault report, narrowed per source kind so an interaction fault shows its
 * command and customId while an event fault shows its event name and handler.
 *
 * @internal
 */
export function faultSummary(denial: Notice, source: FaultSource): string {
    const head = `### A handled fault was reported: \`${denial.name}\`\n**Message:** ${denial.message}\n`;
    if (source.kind === 'event') {
        return (
            `${head}**Event:** ${source.eventName}\n` +
            `**Handler:** ${source.handler}\n` +
            `**User ID:** \`${source.userId ?? 'n/a'}\`\n` +
            `**Guild ID:** \`${source.guildId ?? 'n/a'}\`\n` +
            `**Channel ID:** \`${source.channelId ?? 'n/a'}\``
        );
    }
    return (
        `${head}**Kind:** ${source.interactionKind}\n` +
        `**Command:** ${source.command ?? 'n/a'}\n` +
        `**CustomId:** ${source.customId ?? 'n/a'}\n` +
        `**User ID:** \`${source.userId}\`\n` +
        `**Guild ID:** \`${source.guildId ?? 'n/a'}\`\n` +
        `**Channel ID:** \`${source.channelId ?? 'n/a'}\`\n` +
        `**Interaction ID:** \`${source.interactionId}\``
    );
}

/**
 * The text shown for a denial's cause in the report. Tolerates a non-serializable cause (a bigint or a
 * circular object) so building the report never throws.
 *
 * @internal
 */
export function causeStack(denial: Notice): string {
    const { cause } = denial;
    if (Error.isError(cause)) return cause.stack ?? cause.message;
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
