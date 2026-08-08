import { paint } from '@seedcord/errors/internal';
import { formatFilePath } from '@seedcord/utils';
import chalk from 'chalk';

import type { LogLevel } from './types';
import type { ILogger } from '@seedcord/types';

const COUNT_WRAP_WIDTH = 64;
const CHIP_SEPARATOR = ' · ';

// pack styled count chips onto lines whose visible width stays under maxWidth
function wrapChips(chips: readonly { plain: string; styled: string }[], maxWidth: number): string[] {
    const lines: string[] = [];
    let current: string[] = [];
    let width = 0;
    for (const chip of chips) {
        if (current.length > 0 && width + CHIP_SEPARATOR.length + chip.plain.length > maxWidth) {
            lines.push(current.join(CHIP_SEPARATOR));
            current = [];
            width = 0;
        }
        width += (current.length === 0 ? 0 : CHIP_SEPARATOR.length) + chip.plain.length;
        current.push(chip.styled);
    }
    if (current.length > 0) lines.push(current.join(CHIP_SEPARATOR));
    return lines;
}

/** Logging helpers for lists, summaries, registration lines, and blocks. */
export class LoggerUtilities {
    constructor(private readonly logger: ILogger) {}

    private arrow(text: string): string {
        return `${paint.mute('→')} ${text}`;
    }

    /** Logs a single item with an arrow prefix. */
    public item(text: string, level: LogLevel = 'info'): void {
        this.logger[level](this.arrow(text));
    }

    /** Logs a list of items with an optional heading above them. */
    public list(items: string[], heading?: string, level: LogLevel = 'info'): void {
        if (heading) this.logger[level](heading);
        for (const item of items) this.logger[level](this.arrow(item));
    }

    /** Logs a title with key-value counts, e.g. "Loaded: 5 handlers, 3 commands". */
    public summary(title: string, items: Record<string, number | string>, level: LogLevel = 'info'): void {
        const entries = Object.entries(items).map(([key, value]) => `${paint.iris.bold(String(value))} ${key}`);
        this.logger[level](`${paint.mint.bold(title)}: ${entries.join(', ')}`);
    }

    /** Logs a component registration line, with an optional type label like 'middleware' or 'handler'. */
    public registration(name: string, from: string, type?: string, level: LogLevel = 'info'): void {
        const scope = type ? `${type} ` : '';
        this.logger[level](
            `${chalk.italic('Registered')} ${paint.amber.bold(scope)}${paint.sky.bold(name)} from ${paint.mute(formatFilePath(from))}`
        );
    }

    /** Logs component initialization start or end. */
    public initialization(component: string, action: 'start' | 'end', level: LogLevel = 'info'): void {
        const verb = action === 'start' ? 'Initializing' : 'Initialized';
        this.logger[level](chalk.bold(`${verb} ${component}`));
    }

    /** Logs progress as "[current/total]" with an optional item label. */
    public progress(current: number, total: number, item?: string, level: LogLevel = 'info'): void {
        const base = `[${current}/${total}]`;
        const suffix = item ? ` ${item}` : '';
        this.logger[level](`${paint.sky(base)}${suffix}`);
    }

    /**
     * Logs a heading and its lines as one record so the TUI renders them as a single block.
     * `styleHeading` replaces the default mint bold, pass an identity function for a heading that
     * styles its own spans.
     */
    public block(
        heading: string,
        lines: readonly string[],
        level: LogLevel = 'trace',
        styleHeading: (heading: string) => string = paint.mint.bold
    ): void {
        this.logger[level]([styleHeading(heading), ...lines].join('\n'));
    }

    /** Formats `name path` block lines, names padded to a column and paths relative and dimmed. */
    public entries(items: readonly { name: string; from: string }[]): string[] {
        const width = items.reduce((max, item) => Math.max(max, item.name.length), 0);
        return items.map(
            (item) => `${paint.sky.bold(item.name.padEnd(width))} ${paint.mute(formatFilePath(item.from))}`
        );
    }

    /** Packs labels into `·`-separated lines under `maxWidth`, each styled. */
    public wrap(labels: readonly string[], maxWidth = COUNT_WRAP_WIDTH): string[] {
        return wrapChips(
            labels.map((label) => ({ plain: label, styled: paint.sky.bold(label) })),
            maxWidth
        );
    }

    /** Formats non-zero counts into `N label` chips, wrapped onto lines under `maxWidth`. */
    public counts(record: Record<string, number>, maxWidth = COUNT_WRAP_WIDTH): string[] {
        const chips: { plain: string; styled: string }[] = [];
        for (const [label, value] of Object.entries(record)) {
            if (value <= 0) continue;
            chips.push({ plain: `${value} ${label}`, styled: `${paint.iris.bold(String(value))} ${label}` });
        }
        return wrapChips(chips, maxWidth);
    }
}
