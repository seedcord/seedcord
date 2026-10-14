import { LEVEL_COLOR } from '@seedcord/logger';
import { filterCirculars } from '@seedcord/utils';
import { isPlainObject } from '@seedcord/utils/internal';

import type { LogLevel, LogRecord } from '@seedcord/types';
import type { WireError, WireLogRecord } from '@seedcord/types/internal';

type WireArg = NonNullable<WireLogRecord['args']>[number];

export function toWireError(thrown: unknown): WireError {
    return encodeError(thrown, new Set());
}

function encodeError(thrown: unknown, sent: Set<Error>): WireError {
    if (!Error.isError(thrown)) return { name: 'Error', message: String(thrown) };
    sent.add(thrown);
    const { cause } = thrown;
    return {
        name: thrown.name,
        message: thrown.message,
        stack: thrown.stack,
        code: Reflect.get(thrown, 'code'),
        cause: cause === undefined || (Error.isError(cause) && sent.has(cause)) ? undefined : encodeError(cause, sent)
    };
}

export function fromWireError({ name, message, stack, code, cause }: WireError): Error {
    const error = new Error(message, cause && { cause: fromWireError(cause) });
    error.name = name;
    if (stack !== undefined) error.stack = stack;
    if (code !== undefined) Reflect.set(error, 'code', code);
    return error;
}

function toWireArg(arg: unknown): WireArg {
    if (Error.isError(arg)) return { error: toWireError(arg) };
    return { value: filterCirculars(arg, { mode: 'json' }) };
}

function fromWireArg(arg: WireArg): unknown {
    return 'error' in arg ? fromWireError(arg.error) : arg.value;
}

function toWireLog({ args, ...record }: LogRecord): WireLogRecord {
    return { ...record, args: args?.map(toWireArg) };
}

function fromWireLog({ args, ...record }: WireLogRecord): LogRecord {
    return args ? { ...record, args: args.map(fromWireArg) } : record;
}

// miniflare prints the worker's console output through vite's logger, where seedcord dev reads it back
const DEV_LOG_MARKER = 'seedcord:log ';

export function toDevLogLine(record: LogRecord): string {
    return `${DEV_LOG_MARKER}${JSON.stringify(toWireLog(record))}`;
}

function isLogLevel(value: unknown): value is LogLevel {
    return typeof value === 'string' && Object.hasOwn(LEVEL_COLOR, value);
}

function isWireArgs(value: unknown): value is WireLogRecord['args'] {
    return value === undefined || (Array.isArray(value) && value.every(isPlainObject));
}

function isWireLogRecord(value: unknown): value is WireLogRecord {
    return (
        isPlainObject(value) &&
        isLogLevel(value.level) &&
        typeof value.message === 'string' &&
        typeof value.label === 'string' &&
        typeof value.channel === 'string' &&
        typeof value.timestamp === 'number' &&
        isWireArgs(value.args)
    );
}

// the bot's own console output can start with the marker too
export function fromDevLogLine(line: string): LogRecord | undefined {
    if (!line.startsWith(DEV_LOG_MARKER)) return undefined;
    let parsed: unknown;
    try {
        parsed = JSON.parse(line.slice(DEV_LOG_MARKER.length));
    } catch {
        return undefined;
    }
    return isWireLogRecord(parsed) ? fromWireLog(parsed) : undefined;
}
