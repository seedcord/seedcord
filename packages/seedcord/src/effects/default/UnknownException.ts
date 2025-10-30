import { Logger } from '@seedcord/services';
import { filterCirculars } from '@seedcord/utils';
import { WebhookClient, AttachmentBuilder, SeparatorSpacingSize, DiscordAPIError, SnowflakeUtil } from 'discord.js';
import { Envapt } from 'envapt';

import { BuilderComponent } from '../../interfaces/Components';
import { WebhookLog } from '../bases/WebhookLog';
import { RegisterEffect } from '../decorators/RegisterEffect';
import { AllEffects } from '../types/Effects';

/**
 * Default effect to log unhandled exceptions via webhook. It provides basic information about the error:
 * - Error stack trace
 * - Guild ID and name (if applicable)
 * - User ID and username (if applicable)
 * - A unique UUID for tracking
 * - Timestamps comparing interaction time and error log time (if applicable)
 * - Metadata associated with the error (if provided)
 *
 * Developers need to set the UNKNOWN_EXCEPTION_WEBHOOK_URL environment variable in their .env file otherwise this effect will throw an error during initialization.
 *
 * @throws Error if UNKNOWN_EXCEPTION_WEBHOOK_URL is not set or is invalid
 */
@RegisterEffect('unknownException')
export class UnknownException extends WebhookLog<'unknownException'> {
    private static readonly logger = new Logger('Effect: UnknownException');

    @Envapt('UNKNOWN_EXCEPTION_WEBHOOK_URL', {
        converter(raw, _fallback) {
            if (!raw) throw new Error('Missing UNKNOWN_EXCEPTION_WEBHOOK_URL');
            if (!URL.canParse(String(raw))) throw new Error('Invalid UNKNOWN_EXCEPTION_WEBHOOK_URL');

            return raw;
        }
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
                avatarURL:
                    'https://cdn.discordapp.com/attachments/1351446034827579466/1351446912947191830/warning-2.png',
                components: [new UnhandledErrorContainer(this.data).component],
                files: metadataFile ? [metadataFile] : []
            });
        } catch (error) {
            UnknownException.logger.error('Failed to send unknown exception webhook', error);
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
    constructor(data: AllEffects['unknownException']) {
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

        // Discord epoch offset (ms) and timestamp extraction
        const interactionTs = Number(SnowflakeUtil.deconstruct(snowflake).timestamp);

        // Time difference
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
