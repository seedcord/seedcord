import chalk from 'chalk';

import type { LogLevel } from './types';
import type { ILogger } from '@seedcord/types';

// edge-safe copy of @seedcord/utils formatFilePath, which pulls in node:path + process.cwd().
function formatFilePath(filePath: string): string {
    const cwd = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '';
    if (cwd && filePath.startsWith(cwd)) return `./${filePath.slice(cwd.length).replace(/^[/\\]+/u, '')}`;
    return filePath;
}

/**
 * Decorative logging helpers (lists, summaries, registration lines, boxes) shared across the framework.
 */
export class LoggerUtilities {
    constructor(private readonly logger: ILogger) {}

    private arrow(text: string): string {
        return `${chalk.gray('→')} ${text}`;
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
        const entries = Object.entries(items).map(([key, value]) => `${chalk.magenta.bold(String(value))} ${key}`);
        this.logger[level](`${chalk.bold.green(title)}: ${entries.join(', ')}`);
    }

    /** Logs a component registration line, with an optional type label like 'middleware' or 'handler'. */
    public registration(name: string, from: string, type?: string, level: LogLevel = 'info'): void {
        const scope = type ? `${type} ` : '';
        this.logger[level](
            `${chalk.italic('Registered')} ${chalk.bold.yellow(scope)}${chalk.cyan.bold(name)} from ${chalk.gray(formatFilePath(from))}`
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
        this.logger[level](`${chalk.cyan(base)}${suffix}`);
    }
}
