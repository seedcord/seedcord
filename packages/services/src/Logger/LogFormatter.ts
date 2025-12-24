import stripAnsi from 'strip-ansi';
import { format } from 'winston';

import type { Logform } from 'winston';

interface PrettyFormatOptions {
    padding?: number;
    stripExtras?: boolean;
}

interface JsonFormatOptions {
    stripAnsi?: boolean;
    minimal?: boolean;
}

const SPLAT = Symbol.for('splat');
const DEFAULT_PADDING = 7;

export class LogFormatter {
    private safeString(value: unknown): string {
        if (typeof value === 'string') return value;
        if (value === undefined || value === null) return '';
        if (typeof (value as { toString?: () => string }).toString === 'function') {
            return (value as { toString: () => string }).toString();
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

    private sanitizeExtras(info: Logform.TransformableInfo): unknown[] {
        const raw = (info as unknown as Record<string | symbol, unknown>)[SPLAT];
        const extras = Array.isArray(raw) ? raw : [];
        return extras.map((entry) => this.sanitizeAnsi(entry));
    }

    public pretty(options: PrettyFormatOptions = {}): Logform.Format[] {
        const padding = options.padding ?? DEFAULT_PADDING;
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
                const extras = this.sanitizeExtras(info);

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

    public json(options: JsonFormatOptions = {}): Logform.Format[] {
        const base = [format.timestamp(), format.errors({ stack: true })];

        if (options.stripAnsi) {
            base.push(
                format((info) => {
                    info.message = typeof info.message === 'string' ? stripAnsi(info.message) : info.message;
                    if (typeof info.stack === 'string') info.stack = stripAnsi(info.stack);
                    const extras = this.sanitizeExtras(info);
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
