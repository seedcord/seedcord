import { filterCirculars } from '@seedcord/utils';
import stripAnsi from 'strip-ansi';

import type { ILogSink, LogLevel, LogRecord } from './types';

const SPECIFIER = /%[sdifjoO%]/gu;

function jsonish(value: unknown): string {
    try {
        // JSON.stringify returns undefined for undefined/function/symbol despite its string type.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime undefined
        return JSON.stringify(value) ?? String(value);
    } catch {
        return String(value);
    }
}

// printf over the winston/util specifiers, edge-safe. Returns the leftover args
// the specifiers did not consume so the caller can merge them into queryable fields.
function interpolate(message: string, args: readonly unknown[]): { text: string; rest: unknown[] } {
    let consumed = 0;
    const text = message.replaceAll(SPECIFIER, (spec) => {
        if (spec === '%%') return '%';
        if (consumed >= args.length) return spec;
        const arg = args[consumed++];
        switch (spec) {
            case '%s': {
                return typeof arg === 'string' ? arg : jsonish(arg);
            }
            case '%d':
            case '%i': {
                return String(Math.trunc(Number(arg)));
            }
            case '%f': {
                return String(Number(arg));
            }
            default: {
                return jsonish(arg);
            }
        }
    });
    return { text, rest: args.slice(consumed) };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && !Error.isError(value);
}

function errorShape(error: Error): Record<string, unknown> {
    return {
        name: stripAnsi(error.name),
        message: stripAnsi(error.message),
        ...(error.stack !== undefined && { stack: stripAnsi(error.stack) })
    };
}

/**
 * The edge default sink. Emits one structured object to the severity-matched `console` method so
 * a Workers drain indexes each field. Trailing object args merge into top-level fields, an Error
 * arg serializes to `{ name, message, stack }`. The message and error strings are ANSI-stripped
 * (the output is machine-read), and every value passes through `filterCirculars` so a BigInt
 * or circular reference never throws.
 */
export class ObjectConsoleSink implements ILogSink {
    public readonly kind = 'console';

    public onLog(record: LogRecord): void {
        const { text, rest } = interpolate(record.message, record.args ?? []);

        const fields: Record<string, unknown> = {};
        const extras: unknown[] = [];
        for (const value of rest) {
            if (Error.isError(value)) fields.error = errorShape(value);
            else if (isPlainObject(value)) Object.assign(fields, value);
            else extras.push(value);
        }

        const emitted = filterCirculars(
            {
                ...fields,
                level: record.level,
                message: stripAnsi(text),
                label: record.label,
                channel: record.channel,
                timestamp: new Date(record.timestamp).toISOString(),
                ...(extras.length > 0 && { args: extras })
            },
            { mode: 'json' }
        );

        emit(record.level, emitted);
    }
}

function emit(level: LogLevel, payload: unknown): void {
    // debug carries trace too, workerd has no console.trace
    const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : level === 'info' ? 'info' : 'debug';
    // eslint-disable-next-line no-console -- this sink emits to the console by design
    console[method](payload);
}
