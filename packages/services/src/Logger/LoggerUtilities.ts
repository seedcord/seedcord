import { formatFilePath } from '@seedcord/utils';
import chalk from 'chalk';

import type { ILogger } from '@seedcord/types';

/**
 * Provides access to common logging utilities.
 */
export class LoggerUtilitiesAccessor {
    constructor(private readonly logger: ILogger) {}

    private arrow(text: string): string {
        return `${chalk.gray('→')} ${text}`;
    }

    /**
     * Logs a list of items with optional heading.
     *
     * @param items - Array of items to log as a list
     * @param heading - Optional heading to display above the list
     */
    public list(items: string[], heading?: string): void {
        if (heading) this.logger.info(heading);
        for (const item of items) {
            this.logger.info(this.arrow(item));
        }
    }

    /**
     * Logs a summary with title and key-value pairs.
     * Example: "Loaded: 5 handlers, 3 commands"
     *
     * @param title - The title of the summary
     * @param items - Object with counts/values to display
     */
    public summary(title: string, items: Record<string, number | string>): void {
        const entries = Object.entries(items).map(([key, value]) => `${chalk.magenta.bold(String(value))} ${key}`);
        this.logger.info(`${chalk.bold.green(title)}: ${entries.join(', ')}`);
    }

    /**
     * Logs a component registration message.
     *
     * @param name - Name of the component being registered
     * @param from - File path the component is from
     * @param type - Optional type label (e.g., 'middleware', 'handler')
     */
    public registration(name: string, from: string, type?: string): void {
        const scope = type ? `${type} ` : '';
        this.logger.info(
            `${chalk.italic('Registered')} ${chalk.bold.yellow(scope)}${chalk.cyan.bold(name)} from ${chalk.gray(formatFilePath(from))}`
        );
    }

    /**
     * Logs component initialization start/end.
     *
     * @param component - Name of the component
     * @param action - 'start' or 'end' to indicate initialization phase
     */
    public initialization(component: string, action: 'start' | 'end'): void {
        const verb = action === 'start' ? 'Initializing' : 'Initialized';
        this.logger.info(chalk.bold(`${verb} ${component}`));
    }

    /**
     * Logs progress as "[current/total]" with optional item label.
     *
     * @param current - Current progress count
     * @param total - Total count
     * @param item - Optional item label to append
     */
    public progress(current: number, total: number, item?: string): void {
        const base = `[${current}/${total}]`;
        const suffix = item ? ` ${item}` : '';
        this.logger.info(`${chalk.cyan(base)}${suffix}`);
    }

    /**
     * Logs content in a decorative box.
     *
     * @param title - Title to display in the box
     * @param content - Lines of content to display in the box
     */
    public box(title: string, content: string[]): void {
        const width = Math.max(title.length, ...content.map((line) => line.length)) + 2;
        const horizontal = '─'.repeat(width);
        this.logger.info(`╭${horizontal}╮`);
        this.logger.info(`│ ${title.padEnd(width - 1, ' ')}│`);
        for (const line of content) {
            this.logger.info(`│ ${line.padEnd(width - 1, ' ')}│`);
        }
        this.logger.info(`╰${horizontal}╯`);
    }
}
