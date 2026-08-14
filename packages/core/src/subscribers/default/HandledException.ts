import { stripAnsi } from '@seedcord/utils';

import { BuilderComponent } from '@components/Component';

import { jsonAttachment, neutralizeFences, WebhookSeparator } from '../bases/webhookHelpers';
import { WebhookLog } from '../bases/WebhookLog';
import { Subscribe } from '../decorators/Subscribe';
import { WebhookUrl } from '../decorators/WebhookUrl';

import type { WebhookReport } from '../bases/WebhookLog';
import type { AllSubscriptions, FaultSource } from '../types/Subscriptions';
import type { CoreBase } from '@interfaces/CoreBase';
import type { Notice } from '@stops/Notice';

// no HANDLED_EXCEPTION_WEBHOOK_URL disables the reporter with a boot warning
@Subscribe('handledException')
@WebhookUrl('HANDLED_EXCEPTION_WEBHOOK_URL')
export class HandledException extends WebhookLog<'handledException', CoreBase> {
    protected override throttleKey(): string {
        return `${this.data.routeId}:${this.data.denial.name}`;
    }

    report(suppressed: number): WebhookReport {
        return {
            username: 'Handled Exception',
            components: [new HandledExceptionContainer(this.data, suppressed).component],
            files: [jsonAttachment('source.json', 'The raw source the fault came from', this.data.source.raw)]
        };
    }
}

class HandledExceptionContainer extends BuilderComponent<'container'> {
    constructor(data: AllSubscriptions['handledException'], suppressed: number) {
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

        this.addSuppressedCount(suppressed);
    }

    private addSuppressedCount(suppressed: number): void {
        if (suppressed === 0) return;

        this.instance.addTextDisplayComponents((text) =>
            text.setContent(`-# ${suppressed} more of these since the last report`)
        );
    }
}

function faultSummary(denial: Notice, source: FaultSource): string {
    // name and message carry chalk codes
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

// building the report must not throw on a bigint or a circular cause
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
