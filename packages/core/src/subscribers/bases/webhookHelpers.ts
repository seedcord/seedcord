import { filterCirculars, stripAnsi } from '@seedcord/utils';
import { SeparatorSpacingSize } from 'discord-api-types/v10';

import { BuilderComponent } from '#components/Component';

import type { WebhookFile } from './WebhookSender';

const DISCORD_WEBHOOK_REGEX = new RegExp(
    String.raw`^https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w$-]+$`
);

export function isDiscordWebhookUrl(value: string): boolean {
    return URL.canParse(value) && DISCORD_WEBHOOK_REGEX.test(value);
}

export function jsonAttachment(name: string, description: string, data: unknown): WebhookFile {
    const content = filterCirculars(data);
    return { name, description, data: new TextEncoder().encode(JSON.stringify(content, undefined, 2)) };
}

// the report renders inside a ``` fence, so break any triple-backtick run to keep it from closing early
export function neutralizeFences(text: string): string {
    return text.replaceAll('```', '`​`​`');
}

// discord caps a message at 2000 characters. the fence and heading take the rest.
const REPORT_BUDGET = 1800;

function trace(error: Error): string {
    return error.stack ?? `${error.name}: ${error.message}`;
}

function clamp(text: string, budget: number): string {
    if (text.length <= budget) return text;
    return budget > 0 ? `${text.slice(0, budget - 1)}…` : '';
}

function omittedLine(count: number): string {
    return `\n\nand ${count} more failure${count === 1 ? '' : 's'}`;
}

function memberReport(members: readonly unknown[], budget: number): string {
    // the dropped-count line has to fit even when every member is dropped
    const room = Math.max(budget - omittedLine(members.length).length, 0);
    const share = Math.floor(room / members.length);

    let report = '';
    let shown = 0;
    for (const [index, member] of members.entries()) {
        const heading = `\n\nFailure ${index + 1} of ${members.length}:\n`;
        const body = Error.isError(member) ? trace(member) : String(member);
        const entry = heading + clamp(body, Math.max(share - heading.length, 0));
        if (report.length + entry.length > room) break;
        report += entry;
        shown++;
    }

    const hidden = members.length - shown;
    return hidden > 0 ? report + omittedLine(hidden) : report;
}

// ansi codes are stripped because discord won't render them
export function errorReport(error: Error): string {
    let report = trace(error);
    if (Error.isError(error.cause)) report += `\n\nCaused by:\n${trace(error.cause)}`;

    if (error instanceof AggregateError && error.errors.length > 0) {
        const members: unknown[] = error.errors;
        report += memberReport(members, Math.max(REPORT_BUDGET - report.length, 0));
    }

    return clamp(neutralizeFences(stripAnsi(report)), REPORT_BUDGET);
}

export class WebhookSeparator extends BuilderComponent<'separator'> {
    constructor() {
        super('separator');
        this.instance.setSpacing(SeparatorSpacingSize.Small).setDivider(true);
    }
}
