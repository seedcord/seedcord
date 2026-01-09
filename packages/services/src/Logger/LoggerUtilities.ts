import { formatFilePath } from '@seedcord/utils';
import chalk from 'chalk';

import type { LoggerLevel } from './Types';
import type { ILogger } from '@seedcord/types';

/**
 * Provides access to common logging utilities.
 */
export class LoggerUtilities {
    constructor(private readonly logger: ILogger) {}

    private arrow(text: string): string {
        return `${chalk.gray('→')} ${text}`;
    }

    /**
     * Logs a single item with an arrow prefix.
     * @param text - The text to log
     */
    public item(text: string, level: LoggerLevel = 'info'): void {
        this.logger[level](this.arrow(text));
    }

    /**
     * Logs a list of items with optional heading.
     *
     * @param items - Array of items to log as a list
     * @param heading - Optional heading to display above the list
     */
    public list(items: string[], heading?: string, level: LoggerLevel = 'info'): void {
        if (heading) this.logger[level](heading);
        for (const item of items) {
            this.logger[level](this.arrow(item));
        }
    }

    /**
     * Logs a summary with title and key-value pairs.
     * Example: "Loaded: 5 handlers, 3 commands"
     *
     * @param title - The title of the summary
     * @param items - Object with counts/values to display
     */
    public summary(title: string, items: Record<string, number | string>, level: LoggerLevel = 'info'): void {
        const entries = Object.entries(items).map(([key, value]) => `${chalk.magenta.bold(String(value))} ${key}`);
        this.logger[level](`${chalk.bold.green(title)}: ${entries.join(', ')}`);
    }

    /**
     * Logs a component registration message.
     *
     * @param name - Name of the component being registered
     * @param from - File path the component is from
     * @param type - Optional type label (e.g., 'middleware', 'handler')
     */
    public registration(name: string, from: string, type?: string, level: LoggerLevel = 'info'): void {
        const scope = type ? `${type} ` : '';
        this.logger[level](
            `${chalk.italic('Registered')} ${chalk.bold.yellow(scope)}${chalk.cyan.bold(name)} from ${chalk.gray(formatFilePath(from))}`
        );
    }

    /**
     * Logs component initialization start/end.
     *
     * @param component - Name of the component
     * @param action - 'start' or 'end' to indicate initialization phase
     */
    public initialization(component: string, action: 'start' | 'end', level: LoggerLevel = 'info'): void {
        const verb = action === 'start' ? 'Initializing' : 'Initialized';
        this.logger[level](chalk.bold(`${verb} ${component}`));
    }

    /**
     * Logs progress as "[current/total]" with optional item label.
     *
     * @param current - Current progress count
     * @param total - Total count
     * @param item - Optional item label to append
     */
    public progress(current: number, total: number, item?: string, level: LoggerLevel = 'info'): void {
        const base = `[${current}/${total}]`;
        const suffix = item ? ` ${item}` : '';
        this.logger[level](`${chalk.cyan(base)}${suffix}`);
    }

    /**
     * Logs content in a decorative box.
     *
     * @param title - Title to display in the box
     * @param content - Lines of content to display in the box
     */
    public box(title: string, content: string[], level: LoggerLevel = 'info'): void {
        const width = Math.max(title.length, ...content.map((line) => line.length)) + 2;
        const horizontal = '─'.repeat(width);
        this.logger[level](`╭${horizontal}╮`);
        this.logger[level](`│ ${title.padEnd(width - 1, ' ')}│`);
        for (const line of content) {
            this.logger[level](`│ ${line.padEnd(width - 1, ' ')}│`);
        }
        this.logger[level](`╰${horizontal}╯`);
    }
}
