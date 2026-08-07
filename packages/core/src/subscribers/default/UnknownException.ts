import { DiscordAPIError } from '@discordjs/rest';
import { timestampFromSnowflake } from '@seedcord/utils';

import { BuilderComponent } from '@components/Component';

import { errorReport, jsonAttachment, WebhookSeparator } from '../bases/webhookHelpers';
import { WebhookLog } from '../bases/WebhookLog';
import { Subscribe } from '../decorators/Subscribe';
import { WebhookUrl } from '../decorators/WebhookUrl';

import type { WebhookReport } from '../bases/WebhookLog';
import type { AllSubscriptions } from '../types/Subscriptions';
import type { CoreBase } from '@interfaces/CoreBase';

// no UNKNOWN_EXCEPTION_WEBHOOK_URL disables the reporter with a boot warning
@Subscribe('unknownException')
@WebhookUrl('UNKNOWN_EXCEPTION_WEBHOOK_URL')
export class UnknownException extends WebhookLog<'unknownException', CoreBase> {
    report(): WebhookReport {
        const { metadata } = this.data;
        return {
            username: 'Unknown Exception',
            components: [new UnhandledErrorContainer(this.data).component],
            files: metadata
                ? [jsonAttachment('metadata.json', 'Metadata associated with the error', metadata)]
                : undefined
        };
    }
}

class UnhandledErrorContainer extends BuilderComponent<'container'> {
    constructor(data: AllSubscriptions['unknownException']) {
        super('container');

        const { uuid, error, guild, user, metadata } = data;

        this.instance
            .addTextDisplayComponents((text) =>
                text.setContent(
                    `### An unknown exception was thrown\n` +
                        `**Guild ID:** \`${guild?.id ?? 'Not used in a guild'}\`\n` +
                        `**Guild Name:** ${guild?.name ?? 'Not used in a guild'}\n` +
                        `**User ID:** \`${user?.id ?? 'Missing user info'}\`\n` +
                        `**Username:** ${user?.username ?? 'Missing user info'}\n`
                )
            )
            .addSeparatorComponents(new WebhookSeparator().component)
            .addTextDisplayComponents((text) =>
                text.setContent(`### UUID \`${uuid}\`\n\`\`\`${errorReport(error)}\`\`\``)
            );

        this.addTimestampsIfAvailable(error);
        this.addMetadataIfAvailable(metadata);
    }

    private addTimestampsIfAvailable(error: Error): void {
        if (!(error instanceof DiscordAPIError)) return;

        const now = Date.now();

        const snowflake = error.url.match(/\/interactions\/(\d+)\//)?.[1];
        if (!snowflake) return undefined;

        const interactionTs = timestampFromSnowflake(snowflake);

        const diff = now - interactionTs;
        const seconds = Math.floor(diff / 1000);
        const millis = diff % 1000;

        this.instance
            .addSeparatorComponents(new WebhookSeparator().component)
            .addTextDisplayComponents((text) =>
                text.setContent(
                    `### Timestamps\n` +
                        `- **\`Interaction sent\` :** ${new Date(interactionTs).toISOString()} (${interactionTs})\n` +
                        `- **\`Error logged    \` :** ${new Date(now).toISOString()} (${now})\n` +
                        `- **\`Offset          \` :** ${seconds}s ${millis}ms`
                )
            );
    }

    private addMetadataIfAvailable(metadata: unknown): void {
        if (!metadata) return;

        this.instance
            .addSeparatorComponents(new WebhookSeparator().component)
            .addTextDisplayComponents((text) => text.setContent('### Metadata'))
            .addFileComponents((file) => file.setURL('attachment://metadata.json'));
    }
}
