import { BuilderComponent } from '@seedcord/core';
import { stripAnsi } from '@seedcord/utils';

import { jsonAttachment, neutralizeFences, WebhookSeparator } from '../bases/webhookHelpers';
import { WebhookLog } from '../bases/WebhookLog';
import { Subscribe } from '../decorators/Subscribe';
import { WebhookUrl } from '../decorators/WebhookUrl';

import type { WebhookReport } from '../bases/WebhookLog';
import type { AllSubscriptions, FaultSource } from '../types/Subscriptions';
import type { Notice } from '@seedcord/core';

/**
 * Default subscriber that delivers a reported `Notice` (`report: true`) to a webhook with the
 * denial, the fault source, the threaded uuid, the cause stack, and the raw source as a JSON
 * attachment. The controller boundary throttles identical faults before they reach the bus.
 *
 * Reads its webhook url from HANDLED_EXCEPTION_WEBHOOK_URL. Unset, the reporter is disabled with
 * a boot warning.
 */
@Subscribe('handledException')
@WebhookUrl('HANDLED_EXCEPTION_WEBHOOK_URL')
export class HandledException extends WebhookLog<'handledException'> {
    report(): WebhookReport {
        return {
            username: 'Handled Exception',
            components: [new HandledExceptionContainer(this.data).component],
            files: [jsonAttachment('source.json', 'The raw source the fault came from', this.data.source.raw)]
        };
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
                text.setContent(`### UUID \`${uuid}\`\n\`\`\`${neutralizeFences(causeStack(denial))}\`\`\``)
            )
            .addSeparatorComponents(new WebhookSeparator().component)
            .addTextDisplayComponents((text) => text.setContent('### Source'))
            .addFileComponents((file) => file.setURL('attachment://source.json'));
    }
}

function faultSummary(denial: Notice, source: FaultSource): string {
    // name and message carry chalk, the webhook payload renders them raw
    const head = stripAnsi(`### A handled fault was reported: \`${denial.name}\`\n**Message:** ${denial.message}\n`);
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

// every cause shape returns a string, building the report never throws on a bigint or circular cause
function causeStack(denial: Notice): string {
    const { cause } = denial;
    if (Error.isError(cause)) return stripAnsi(cause.stack ?? cause.message);
    if (typeof cause === 'string') return stripAnsi(cause);
    if (typeof cause === 'bigint' || typeof cause === 'symbol' || typeof cause === 'function') return cause.toString();
    if (cause !== undefined) {
        try {
            return JSON.stringify(cause);
        } catch {
            return '[unserializable cause]';
        }
    }
    return stripAnsi(denial.stack ?? 'No cause recorded.');
}
