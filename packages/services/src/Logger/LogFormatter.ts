import stripAnsi from 'strip-ansi';
import { format } from 'winston';

import type { Logform } from 'winston';

/**
 * Options for pretty log formatting.
 */
export interface PrettyFormatOptions {
    /** Number of spaces to pad the log level to. (default: `7`) */
    padding?: number;
    /** Whether to strip ANSI codes from extra log data. (default: `false`) */
    stripExtras?: boolean;
}

/**
 * Options for JSON log formatting.
 * @internal
 */
export interface JsonFormatOptions {
    /** Whether to strip ANSI codes from log messages and extra data. (default: `false`) */
    stripAnsi?: boolean;
    /** Whether to produce minimal JSON output without extra fields. (default: `false`) */
    minimal?: boolean;
}

/**
 * Handles log formatting for console and file outputs.
 *
 * Supports pretty-printed colored logs for development
 * and JSON logs for production with optional ANSI stripping.
 * @internal
 */
export class LogFormatter {
    private readonly DEFAULT_PADDING = 7;
    private readonly SPLAT: symbol = Symbol.for('splat');

    private safeString(value: unknown): string {
        if (typeof value === 'string') return value;
        if (value === undefined || value === null) return '';
        if (typeof (value as { toString?: () => string }).toString === 'function') {
            return String((value as { toString: () => string }).toString());
        }
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value);
            } catch {
                return '';
            }
        }
        return '';
    }

    private sanitizeAnsi(value: unknown): unknown {
        if (typeof value === 'string') return stripAnsi(value);
        if (value instanceof Error) {
            const error = value;
            const sanitized = new Error(stripAnsi(error.message));
            sanitized.name = error.name;
            if (typeof error.stack === 'string') sanitized.stack = stripAnsi(error.stack);
            return sanitized;
        }
        return value;
    }

    private getExtras(info: Logform.TransformableInfo): unknown[] {
        const raw = (info as unknown as Record<string | symbol, unknown>)[this.SPLAT];
        return Array.isArray(raw) ? raw : [];
    }

    /**
     * Creates pretty-printed format with colors and timestamps.
     *
     * Ideal for development environments where human readability matters.
     *
     * @param options - Formatting options including padding and ANSI stripping
     * @returns Array of Winston format transformers
     */
    public pretty(options: PrettyFormatOptions = {}): Logform.Format[] {
        const padding = options.padding ?? this.DEFAULT_PADDING;
        return [
            format.errors({ stack: true }),
            format.splat(),
            format.colorize({ level: true }),
            format.timestamp({ format: 'D MMM, hh:mm:ss a' }),
            // eslint-disable-next-line max-statements
            format.printf((info: Logform.TransformableInfo) => {
                let ts = this.safeString(info.timestamp);
                let lvl = this.safeString(info.level).padEnd(padding);
                let lbl = this.safeString(info.label);
                let msg = this.safeString(info.message);

                // Strip ANSI codes from all components if requested
                if (options.stripExtras) {
                    ts = stripAnsi(ts);
                    lvl = stripAnsi(lvl);
                    lbl = stripAnsi(lbl);
                    msg = stripAnsi(msg);
                }

                const base = `${ts} [${lvl}]: ${lbl} - ${msg}`;
                const extras = this.getExtras(info);

                let rendered = base;

                if (typeof info.stack === 'string') {
                    let stack = this.safeString(info.stack);
                    if (options.stripExtras) stack = stripAnsi(stack);
                    rendered += `\n${stack}`;
                }

                const cleaned = options.stripExtras ? extras.map((entry) => this.sanitizeAnsi(entry)) : extras;
                const filtered = cleaned.filter((x) => {
                    if (!x) return false;
                    if (typeof x !== 'object') return true;
                    return Object.keys(x).length > 0;
                });

                if (filtered.length) {
                    const parts: string[] = [];
                    for (const x of filtered) {
                        if (typeof x === 'string') parts.push(x);
                        else {
                            try {
                                parts.push(JSON.stringify(x, null, 2));
                            } catch {
                                parts.push(String(x));
                            }
                        }
                    }
                    rendered += `\n${parts.join(' ')}`;
                }

                return rendered;
            })
        ];
    }

    /**
     * Creates JSON format for structured logging.
     *
     * Best for production environments where logs are parsed by tools.
     *
     * @param options - JSON formatting options including ANSI stripping and minimal mode
     * @returns Array of Winston format transformers
     */
    public json(options: JsonFormatOptions = {}): Logform.Format[] {
        const base = [format.timestamp(), format.errors({ stack: true })];

        if (options.stripAnsi) {
            base.push(
                format((info) => {
                    info.message = typeof info.message === 'string' ? stripAnsi(info.message) : info.message;
                    if (typeof info.stack === 'string') info.stack = stripAnsi(info.stack);
                    const extras = this.getExtras(info);
                    if (extras.length)
                        (info as Record<string, unknown>).extras = extras.map((entry) => this.sanitizeAnsi(entry));
                    return info;
                })()
            );
        }

        base.push(options.minimal ? format.json({}) : format.json({ bigint: true, space: 0 }));

        return base;
    }
}
