import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import { format } from 'winston';

import { LEVEL_COLOR } from '../palette';

import type { Logform } from 'winston';

/** An Error temporarily annotated with its ANSI-formatted name while pretty-printing stacks. */
type FormattedError = Error & { __formattedName?: string; __plainName?: string };

interface PrettyFormatOptions {
    padding?: number; // level column width, default 7
    stripExtras?: boolean;
    prefix?: boolean; // false emits just the message body, the TUI draws its own time/level/label
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

    // winston's colorize only maps @colors/colors style names (theme-remapped 16-color), so color the
    // level from the shared truecolor LEVEL_COLOR. pad first, as an ansi-wrapped level breaks padEnd.
    private renderLevel(level: string, padding: number, strip: boolean): string {
        const padded = level.padEnd(padding);
        if (strip) return padded;
        const palette: Partial<Record<string, string>> = LEVEL_COLOR;
        const hex = palette[level];
        return hex ? chalk.hex(hex)(padded) : padded;
    }

    private assembleBase(prefix: boolean, ts: string, lvl: string, lbl: string, msg: string): string {
        // indent continuation lines so a multi-line block message nests under the heading in a prefixed run
        return prefix ? `${ts} [${lvl}]: ${lbl} - ${msg.replaceAll('\n', '\n  ')}` : msg;
    }

    /** The pretty format chain, colored and timestamped for dev. */
    public pretty(options: PrettyFormatOptions = {}): Logform.Format[] {
        const padding = options.padding ?? this.DEFAULT_PADDING;
        return [
            this.preserveErrorFormatting(),
            format.errors({ stack: true }),
            this.restoreErrorFormatting(),
            format.splat(),
            format.timestamp({ format: 'D MMM, hh:mm:ss a' }),
            // eslint-disable-next-line max-statements -- printf assembles the whole log line in one pass
            format.printf((info: Logform.TransformableInfo) => {
                let ts = this.safeString(info.timestamp);
                const levelName = this.safeString(info.level);
                let lbl = this.safeString(info.label);
                let msg = this.safeString(info.message);

                if (options.stripExtras) {
                    ts = stripAnsi(ts);
                    lbl = stripAnsi(lbl);
                    msg = stripAnsi(msg);
                }

                const lvl = this.renderLevel(levelName, padding, options.stripExtras === true);
                const base = this.assembleBase(options.prefix !== false, ts, lvl, lbl, msg);
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
        const base = [format.errors({ stack: true })];

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
