import stripAnsi from 'strip-ansi';
import { format } from 'winston';

import type { Logform } from 'winston';

// winston's npm palette has no 'trace' color, so the level colors are passed to colorize inline.
const LEVEL_COLORS = { error: 'red', warn: 'yellow', info: 'green', debug: 'blue', trace: 'gray' };

/** An Error temporarily annotated with its ANSI-formatted name while pretty-printing stacks. */
type FormattedError = Error & { __formattedName?: string; __plainName?: string };

interface PrettyFormatOptions {
    padding?: number; // level column width, default 7
    stripExtras?: boolean;
}

interface JsonFormatOptions {
    stripAnsi?: boolean;
    minimal?: boolean;
}

/** Builds the winston format chains, pretty for dev and JSON for prod. @internal */
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
        if (Error.isError(value)) {
            const error = value;
            const sanitized = new Error(stripAnsi(error.message));
            sanitized.name = error.name;
            if (typeof error.stack === 'string') sanitized.stack = stripAnsi(error.stack);
            return sanitized;
        }
        return value;
    }

    private getExtras(info: Logform.TransformableInfo): unknown[] {
        const raw = info[this.SPLAT];
        return Array.isArray(raw) ? raw : [];
    }

    private readonly FORMAT_SPECIFIERS = /%[sdifjoO]/gu;
    private readonly HAD_FORMAT_KEY = Symbol.for('hadFormatSpecifiers');
    private readonly SAVED_SPLAT_KEY = Symbol.for('savedSplat');

    private markFormatSpecifiers(): Logform.Format {
        return format((info) => {
            const msg = typeof info.message === 'string' ? info.message : '';
            const extras = this.getExtras(info);
            const matches = msg.match(this.FORMAT_SPECIFIERS);
            const formatCount = matches ? matches.length : 0;
            info[this.HAD_FORMAT_KEY] = formatCount;
            info[this.SAVED_SPLAT_KEY] = [...extras];
            return info;
        })();
    }

    public createPreFormat(): Logform.Format {
        return this.markFormatSpecifiers();
    }

    private preserveErrorFormatting(): Logform.Format {
        return format((info) => {
            const extras = this.getExtras(info);

            for (const item of extras) {
                if (!(Error.isError(item) && /\u001B/u.test(item.name))) continue;

                const originalName = item.name;
                const plainName = stripAnsi(item.name);

                const formatted = item as FormattedError;
                formatted.__formattedName = originalName;
                formatted.__plainName = plainName;
            }

            return info;
        })();
    }

    private restoreErrorFormatting(): Logform.Format {
        return format((info) => {
            if (typeof info.stack === 'string') {
                const extras = this.getExtras(info);

                for (const item of extras) {
                    if (!Error.isError(item)) continue;

                    const { __formattedName: formattedName, __plainName: plainName } = item as FormattedError;

                    if (typeof formattedName === 'string' && typeof plainName === 'string') {
                        info.stack = (info.stack as string).replace(
                            new RegExp(`^${this.escapeRegex(plainName)}`, 'm'),
                            formattedName
                        );
                    }
                }
            }

            return info;
        })();
    }

    private escapeRegex(str: string): string {
        return RegExp.escape(str);
    }

    /** The pretty format chain, colored and timestamped for dev. */
    public pretty(options: PrettyFormatOptions = {}): Logform.Format[] {
        const padding = options.padding ?? this.DEFAULT_PADDING;
        return [
            this.preserveErrorFormatting(),
            format.errors({ stack: true }),
            this.restoreErrorFormatting(),
            format.splat(),
            format.colorize({ level: true, colors: LEVEL_COLORS }),
            format.timestamp({ format: 'D MMM, hh:mm:ss a' }),
            // eslint-disable-next-line max-statements -- printf assembles the whole log line in one pass
            format.printf((info: Logform.TransformableInfo) => {
                let ts = this.safeString(info.timestamp);
                let lvl = this.safeString(info.level).padEnd(padding);
                let lbl = this.safeString(info.label);
                let msg = this.safeString(info.message);

                if (options.stripExtras) {
                    ts = stripAnsi(ts);
                    lvl = stripAnsi(lvl);
                    lbl = stripAnsi(lbl);
                    msg = stripAnsi(msg);
                }

                const base = `${ts} [${lvl}]: ${lbl} - ${msg}`;
                const savedExtras = info[this.SAVED_SPLAT_KEY];
                // Array.isArray widens to any[] so annotate unknown[] so filter is type safe
                const extras: unknown[] = Array.isArray(savedExtras) ? savedExtras : this.getExtras(info);

                let rendered = base;

                if (typeof info.stack === 'string') {
                    let stack = this.safeString(info.stack);
                    if (options.stripExtras) stack = stripAnsi(stack);
                    rendered += `\n${stack}`;
                }

                const cleaned = options.stripExtras ? extras.map((entry) => this.sanitizeAnsi(entry)) : extras;
                const rawFormatCount = info[this.HAD_FORMAT_KEY];
                const formatSpecifierCount = typeof rawFormatCount === 'number' ? rawFormatCount : 0;
                const filtered = cleaned.filter((x, index) => {
                    if (x === null || x === undefined) return false;
                    if (Error.isError(x) && typeof info.stack === 'string') return false;
                    if (typeof x !== 'object') return index >= formatSpecifierCount;

                    return Object.keys(x).length > 0;
                });

                if (filtered.length > 0) {
                    const primitives: string[] = [];
                    const objects: string[] = [];

                    for (const x of filtered) {
                        if (typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean') {
                            primitives.push(String(x));
                        } else {
                            try {
                                objects.push(JSON.stringify(x, null, 2));
                            } catch {
                                objects.push(String(x));
                            }
                        }
                    }

                    if (primitives.length > 0) rendered += ` ${primitives.join(' ')}`;
                    if (objects.length > 0) rendered += `\n${objects.join('\n')}`;
                }

                return rendered;
            })
        ];
    }

    /** The JSON format chain for prod, with optional ANSI stripping. */
    public json(options: JsonFormatOptions = {}): Logform.Format[] {
        const base = [format.timestamp(), format.errors({ stack: true })];

        if (options.stripAnsi) {
            base.push(
                format((info) => {
                    info.message = typeof info.message === 'string' ? stripAnsi(info.message) : info.message;
                    if (typeof info.stack === 'string') info.stack = stripAnsi(info.stack);
                    const extras = this.getExtras(info);
                    if (extras.length > 0) info.extras = extras.map((entry) => this.sanitizeAnsi(entry));
                    return info;
                })()
            );
        }

        base.push(options.minimal ? format.json({}) : format.json({ bigint: true, space: 0 }));

        return base;
    }
}
