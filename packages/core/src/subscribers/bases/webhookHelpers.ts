import { filterCirculars, stripAnsi } from '@seedcord/utils';
import { SeparatorSpacingSize } from 'discord-api-types/v10';

import { BuilderComponent } from '@components/Component';

import type { WebhookFile } from './WebhookSender';

const DISCORD_WEBHOOK_REGEX = new RegExp(
    String.raw`^https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w$-]+$`
);

export function isDiscordWebhookUrl(value: string): boolean {
    return URL.canParse(value) && DISCORD_WEBHOOK_REGEX.test(value);
}

export function jsonAttachment(name: string, description: string, data: unknown): WebhookFile {
    const content = filterCirculars(data);
    return { name, description, data: JSON.stringify(content, undefined, 2) };
}

// the report renders inside a ``` fence, break any triple-backtick run to keep it from closing early
export function neutralizeFences(text: string): string {
    return text.replaceAll('```', '`​`​`');
}

/** An error's stack with its direct cause appended (one level), ANSI-stripped for the webhook payload. */
export function errorReport(error: Error): string {
    let report = error.stack ?? `${error.name}: ${error.message}`;
    if (Error.isError(error.cause)) {
        const cause = error.cause.stack ?? `${error.cause.name}: ${error.cause.message}`;
        report += `\n\nCaused by:\n${cause}`;
    }
    const stripped = neutralizeFences(stripAnsi(report));
    // eslint-disable-next-line no-magic-numbers
    return stripped.length > 1800 ? `${stripped.slice(0, 1799)}…` : stripped;
}

export class WebhookSeparator extends BuilderComponent<'separator'> {
    constructor() {
        super('separator');
        this.instance.setSpacing(SeparatorSpacingSize.Small).setDivider(true);
    }
}
