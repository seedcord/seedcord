import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { filterCirculars } from '@seedcord/utils';
import { WebhookClient, AttachmentBuilder, SeparatorSpacingSize, DiscordAPIError, SnowflakeUtil } from 'discord.js';
import { Envapt } from 'envapt';

import { BuilderComponent } from '@interfaces/Components';

import { WebhookLog } from '../bases/WebhookLog';
import { Subscribe } from '../decorators/Subscribe';

import type { AllSubscriptions } from '../types/Subscriptions';

const DISCORD_WEBHOOK_REGEX = new RegExp(
    String.raw`^https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w$-]+$`
);

function webhookUrlValidator(raw: unknown, _fallback: unknown): string {
    if (raw !== null && typeof raw !== 'string') {
        throw new SeedcordError(SeedcordErrorCode.ConfigUnknownExceptionWebhookInvalid);
    }

    const value = raw?.trim() ?? '';
    if (value === '') {
        throw new SeedcordError(SeedcordErrorCode.ConfigUnknownExceptionWebhookMissing);
    }

    if (!URL.canParse(value) || !DISCORD_WEBHOOK_REGEX.test(value)) {
        throw new SeedcordError(SeedcordErrorCode.ConfigUnknownExceptionWebhookInvalid);
    }

    return value;
}

/**
 * Default subscriber to log unhandled exceptions via webhook. It provides basic information about the error:
 * - Error stack trace
 * - Guild ID and name (if applicable)
 * - User ID and username (if applicable)
 * - A unique UUID for tracking
 * - Timestamps comparing interaction time and error log time (if applicable)
 * - Metadata associated with the error (if provided)
 *
 * Developers need to set the UNKNOWN_EXCEPTION_WEBHOOK_URL environment variable in their .env file otherwise this subscriber will throw an error during initialization.
 *
 * @throws A {@link SeedcordError} if UNKNOWN_EXCEPTION_WEBHOOK_URL is not set or is invalid
 */
@Subscribe('unknownException')
export class UnknownException extends WebhookLog<'unknownException'> {
    @Envapt('UNKNOWN_EXCEPTION_WEBHOOK_URL', {
        converter: (raw, fallback) => webhookUrlValidator(raw, fallback)
    })
    declare static readonly unknownExceptionWebhookUrl: string;

    webhook = new WebhookClient({
        url: UnknownException.unknownExceptionWebhookUrl
    });

    async execute(): Promise<void> {
        const metadataFile = this.prepareMetadataFile();

        try {
            await this.webhook.send({
                flags: 'IsComponentsV2',
                withComponents: true,
                username: 'Unknown Exception',
                components: [new UnhandledErrorContainer(this.data).component],
                files: metadataFile ? [metadataFile] : []
            });
        } catch (error) {
            this.logger.error('Failed to send unknown exception webhook', error);
        }
    }

    private prepareMetadataFile(): AttachmentBuilder | null {
        const { metadata } = this.data;
        if (!metadata) return null;

        const content = filterCirculars(metadata);
        return new AttachmentBuilder(Buffer.from(JSON.stringify(content, undefined, 2), 'utf-8'), {
            name: 'metadata.json',
            description: 'Metadata associated with the error'
        });
    }
}

class DefaultSeparator extends BuilderComponent<'separator'> {
    constructor() {
        super('separator');

        this.instance.setSpacing(SeparatorSpacingSize.Small).setDivider(true);
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
            .addSeparatorComponents(new DefaultSeparator().component)
            .addTextDisplayComponents((text) => text.setContent(`### UUID \`${uuid}\`\n\`\`\`${error.stack}\`\`\``));

        this.addTimestampsIfAvailable(error);
        this.addMetadataIfAvailable(metadata);
    }

    private addTimestampsIfAvailable(error: Error): void {
        if (!(error instanceof DiscordAPIError)) return;

        const now = Date.now();

        // Extract the snowflake ID from `/interactions/{ID}/`
        const snowflake = error.url.match(/\/interactions\/(\d+)\//)?.[1];
        if (!snowflake) return undefined;

        const interactionTs = Number(SnowflakeUtil.deconstruct(snowflake).timestamp);

        const diff = now - interactionTs;
        const seconds = Math.floor(diff / 1000);
        const millis = diff % 1000;

        this.instance
            .addSeparatorComponents(new DefaultSeparator().component)
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
            .addSeparatorComponents(new DefaultSeparator().component)
            .addTextDisplayComponents((text) => text.setContent('### Metadata'))
            .addFileComponents((file) => file.setURL('attachment://metadata.json'));
    }
}
