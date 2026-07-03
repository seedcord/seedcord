import { BuilderComponent } from '@seedcord/core';
import { filterCirculars } from '@seedcord/utils';
import { AttachmentBuilder, SeparatorSpacingSize } from 'discord.js';

const DISCORD_WEBHOOK_REGEX = new RegExp(
    String.raw`^https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w$-]+$`
);

/**
 * Whether a string is a well-formed Discord webhook URL.
 *
 * @internal
 */
export function isDiscordWebhookUrl(value: string): boolean {
    return URL.canParse(value) && DISCORD_WEBHOOK_REGEX.test(value);
}

/**
 * Serializes a value to a JSON attachment, made circular-safe first.
 *
 * @internal
 */
export function jsonAttachment(name: string, description: string, data: unknown): AttachmentBuilder {
    const content = filterCirculars(data);
    return new AttachmentBuilder(Buffer.from(JSON.stringify(content, undefined, 2), 'utf8'), { name, description });
}

/**
 * The small divider the default webhook reporters place between sections.
 *
 * @internal
 */
export class WebhookSeparator extends BuilderComponent<'separator'> {
    constructor() {
        super('separator');
        this.instance.setSpacing(SeparatorSpacingSize.Small).setDivider(true);
    }
}
