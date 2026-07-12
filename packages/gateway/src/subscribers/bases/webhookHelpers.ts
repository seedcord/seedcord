import { BuilderComponent } from '@seedcord/core';
import { filterCirculars } from '@seedcord/utils';
import { SeparatorSpacingSize } from 'discord-api-types/v10';

import type { WebhookFile } from './WebhookSender';

const DISCORD_WEBHOOK_REGEX = new RegExp(
    String.raw`^https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w$-]+$`
);

export function isDiscordWebhookUrl(value: string): boolean {
    return URL.canParse(value) && DISCORD_WEBHOOK_REGEX.test(value);
}

export function jsonAttachment(name: string, description: string, data: unknown): WebhookFile {
    const content = filterCirculars(data);
    return { name, description, data: Buffer.from(JSON.stringify(content, undefined, 2), 'utf8') };
}

export class WebhookSeparator extends BuilderComponent<'separator'> {
    constructor() {
        super('separator');
        this.instance.setSpacing(SeparatorSpacingSize.Small).setDivider(true);
    }
}
