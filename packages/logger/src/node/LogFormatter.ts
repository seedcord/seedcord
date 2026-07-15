import { stripAnsi } from '@seedcord/utils';
import chalk from 'chalk';
import { format } from 'winston';

import { LEVEL_COLOR, paint } from '../palette';

import type { Logform } from 'winston';

const DEFAULT_PADDING = 5;
const SPLAT = Symbol.for('splat'); // winston triple-beam splat key
// local symbols keep this internal state out of the global Symbol.for registry
const HAD_FORMAT_KEY = Symbol('hadFormatSpecifiers');
const SAVED_SPLAT_KEY = Symbol('savedSplat');
// %% takes no arg, keep it out of the count. ObjectConsoleSink matches %% because it substitutes it inline.
const FORMAT_SPECIFIERS = /%[sdifjoO]/gu;

interface PrettyFormatOptions {
    padding?: number; // level column width
    stripExtras?: boolean;
    // the TUI renders its own time/level/label
    prefix?: boolean;
}

interface JsonFormatOptions {
    stripAnsi?: boolean;
}

/** @internal */
export class LogFormatter {
    // WeakMap keeps framework state off the Error object
    private readonly errorNames = new WeakMap<Error, { formatted: string; plain: string }>();

    private safeString(value: unknown): string {
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
        return '';
    }

    private sanitizeAnsi(value: unknown): unknown {
        if (typeof value === 'string') return stripAnsi(value);
        if (Error.isError(value)) {
            const error = value;
            const sanitized = new Error(stripAnsi(error.message));
            sanitized.name = error.name;
            if (typeof error.stack === 'string') sanitized.stack = stripAnsi(error.stack);
            // carry the cause so a cause block still renders on the stripped copy
            if (Error.isError(error.cause)) sanitized.cause = this.sanitizeAnsi(error.cause);
            return sanitized;
        }
        return value;
    }

    private getExtras(info: Logform.TransformableInfo): unknown[] {
        const raw = info[SPLAT];
        return Array.isArray(raw) ? raw : [];
    }

    // one level, an Error stack already carries its own name and message
    private causeBlock(error: Error, strip: boolean): string {
        const { cause } = error;
        if (!Error.isError(cause)) return '';
        const body = typeof cause.stack === 'string' ? cause.stack : `${cause.name}: ${cause.message}`;
        const heading = strip ? 'Caused by:' : paint.mute('Caused by:');
        return `\n${heading}\n${strip ? stripAnsi(body) : body}`;
    }

    private markFormatSpecifiers(): Logform.Format {
        return format((info) => {
            const msg = typeof info.message === 'string' ? info.message : '';
            const extras = this.getExtras(info);
            const matches = msg.match(FORMAT_SPECIFIERS);
            const formatCount = matches ? matches.length : 0;
            info[HAD_FORMAT_KEY] = formatCount;
            // snapshot before format.splat consumes args, so renderExtras's specifier-index filter stays aligned
            info[SAVED_SPLAT_KEY] = [...extras];
            return info;
        })();
    }

    public createPreFormat(): Logform.Format {
        return this.markFormatSpecifiers();
    }

    private preserveErrorFormatting(): Logform.Format {
        return format((info) => {
            for (const item of this.getExtras(info)) {
                if (!(Error.isError(item) && /\x1B/u.test(item.name))) continue;
                this.errorNames.set(item, { formatted: item.name, plain: stripAnsi(item.name) });
            }
            return info;
        })();
    }

    private restoreErrorFormatting(): Logform.Format {
        return format((info) => {
            if (typeof info.stack !== 'string') return info;
            let stack = info.stack;
            for (const item of this.getExtras(info)) {
                if (!Error.isError(item)) continue;
                const names = this.errorNames.get(item);
                if (names) stack = stack.replace(new RegExp(`^${RegExp.escape(names.plain)}`, 'm'), names.formatted);
            }
            info.stack = stack;
            return info;
        })();
    }

    private renderLevel(level: string, padding: number, strip: boolean): string {
        const padded = level.padEnd(padding); // pad before colorizing, an ansi-wrapped level breaks padEnd
        if (strip) return padded;
        const palette: Partial<Record<string, string>> = LEVEL_COLOR;
        const hex = palette[level];
        // truecolor, winston colorize only maps 16-color @colors/colors names
        return hex ? chalk.hex(hex)(padded) : padded;
    }

    private assembleBase(prefix: boolean, ts: string, lvl: string, lbl: string, msg: string): string {
        // a multi-line block nests under the heading
        return prefix ? `${ts} [${lvl}]: ${lbl} - ${msg.replaceAll('\n', '\n  ')}` : msg;
    }

    public pretty(options: PrettyFormatOptions = {}): Logform.Format[] {
        const padding = options.padding ?? DEFAULT_PADDING;
        return [
            this.preserveErrorFormatting(),
            format.errors({ stack: true }),
            this.restoreErrorFormatting(),
            format.splat(),
            format.timestamp({ format: 'D MMM, hh:mm:ss a' }),

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
                const base = this.assembleBase(options.prefix ?? true, ts, lvl, lbl, msg);
                const savedExtras = info[SAVED_SPLAT_KEY];
                // Array.isArray widens to any[]
                const extras: unknown[] = Array.isArray(savedExtras) ? savedExtras : this.getExtras(info);

                let rendered = base;

                if (typeof info.stack === 'string') {
                    let stack = this.safeString(info.stack);
                    if (options.stripExtras) stack = stripAnsi(stack);
                    rendered += `\n${stack}`;
                    // the stringified info.stack dropped the cause, re-derive it from the Error
                    const firstError = extras.find((entry): entry is Error => Error.isError(entry));
                    if (firstError) rendered += this.causeBlock(firstError, options.stripExtras === true);
                }

                const rawFormatCount = info[HAD_FORMAT_KEY];
                const formatSpecifierCount = typeof rawFormatCount === 'number' ? rawFormatCount : 0;
                return (
                    rendered +
                    this.renderExtras(
                        extras,
                        typeof info.stack === 'string',
                        formatSpecifierCount,
                        options.stripExtras === true
                    )
                );
            })
        ];
    }

    private renderExtras(extras: unknown[], hasStack: boolean, formatSpecifierCount: number, strip: boolean): string {
        const cleaned = strip ? extras.map((entry) => this.sanitizeAnsi(entry)) : extras;
        let firstErrorDropped = false;
        const filtered = cleaned.filter((x, index) => {
            if (x === null || x === undefined || x === '') return false;
            if (Error.isError(x)) {
                // the first Error's stack already renders as info.stack, skip it
                if (hasStack && !firstErrorDropped) {
                    firstErrorDropped = true;
                    return false;
                }
                return true;
            }
            // a value at a format-specifier position was already interpolated into the message
            if (index < formatSpecifierCount) return false;
            if (typeof x !== 'object') return true;
            return Object.keys(x).length > 0;
        });
        if (filtered.length === 0) return '';

        const primitives: string[] = [];
        const objects: string[] = [];
        for (const x of filtered) {
            if (Error.isError(x))
                objects.push(
                    (typeof x.stack === 'string' ? x.stack : `${x.name}: ${x.message}`) + this.causeBlock(x, strip)
                );
            else if (typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean')
                primitives.push(String(x));
            else {
                try {
                    objects.push(JSON.stringify(x, null, 2));
                } catch {
                    objects.push(String(x));
                }
            }
        }

        const inline = primitives.length > 0 ? ` ${primitives.join(' ')}` : '';
        const block = objects.length > 0 ? `\n${objects.join('\n')}` : '';
        return inline + block;
    }

    public json(options: JsonFormatOptions = {}): Logform.Format[] {
        const base = [format.errors({ stack: true })];

        if (options.stripAnsi) {
            base.push(
                format((info) => {
                    info.message = typeof info.message === 'string' ? stripAnsi(info.message) : info.message;
                    const extras = this.getExtras(info);
                    if (typeof info.stack === 'string') {
                        // the stringified info.stack dropped the cause, re-derive it from the Error
                        const firstError = extras.find((entry): entry is Error => Error.isError(entry));
                        info.stack = stripAnsi(info.stack) + (firstError ? this.causeBlock(firstError, true) : '');
                    }
                    if (extras.length > 0) info.extras = extras.map((entry) => this.sanitizeAnsi(entry));
                    return info;
                })()
            );
        }

        base.push(format.json({ bigint: true, space: 0 }));

        return base;
    }
}
