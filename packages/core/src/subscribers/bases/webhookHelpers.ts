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

// the report goes inside a ``` code block, so a stray ``` in the text would close it early
export function breakBackticks(text: string): string {
    return text.replaceAll('```', '`​`​`');
}

// discord caps a message at 2000 characters. the backticks and heading take the rest.
const REPORT_BUDGET = 1800;

// breakBackticks grows the text by 2 chars per run
function body(value: unknown): string {
    const raw = Error.isError(value) ? (value.stack ?? `${value.name}: ${value.message}`) : String(value);
    return breakBackticks(stripAnsi(raw));
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
        const entry = heading + clamp(body(member), Math.max(share - heading.length, 0));
        if (report.length + entry.length > room) break;
        report += entry;
        shown++;
    }

    const hidden = members.length - shown;
    return hidden > 0 ? report + omittedLine(hidden) : report;
}

// ansi codes are stripped because discord won't render them
export function errorReport(error: Error): string {
    let head = body(error);
    if (Error.isError(error.cause)) head += `\n\nCaused by:\n${body(error.cause)}`;

    const members: unknown[] = error instanceof AggregateError ? error.errors : [];
    if (members.length === 0) return clamp(head, REPORT_BUDGET);

    // a long parent stack would otherwise push the dropped-count line off the end
    const report = clamp(head, REPORT_BUDGET - omittedLine(members.length).length);
    return report + memberReport(members, REPORT_BUDGET - report.length);
}

export class WebhookSeparator extends BuilderComponent<'separator'> {
    constructor() {
        super('separator');
        this.instance.setSpacing(SeparatorSpacingSize.Small).setDivider(true);
    }
}
