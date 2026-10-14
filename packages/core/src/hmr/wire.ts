import { LEVEL_COLOR } from '@seedcord/logger';
import { filterCirculars } from '@seedcord/utils';
import { isPlainObject } from '@seedcord/utils/internal';

import type { LogLevel, LogRecord } from '@seedcord/types';
import type { WireError } from '@seedcord/types/internal';

// each arg is either an Error or a JSON-safe value
type WireArg = { error: WireError } | { value: unknown };

interface WireLogRecord extends Omit<LogRecord, 'args'> {
    args?: WireArg[] | undefined;
}

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
    // JSON has no form for the first four. each travels as the text console.log prints
    switch (typeof arg) {
        case 'undefined':
        case 'symbol': {
            return { value: String(arg) };
        }
        case 'bigint': {
            return { value: `${arg}n` };
        }
        case 'function': {
            return { value: `[Function: ${arg.name || '(anonymous)'}]` };
        }
        default: {
            return { value: filterCirculars(arg, { mode: 'json' }) };
        }
    }
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

// seedcord dev's workerLogger reads these lines back out of the worker's console output
const DEV_LOG_MARKER = 'seedcord:log ';

export function toDevLogLine(record: LogRecord): string {
    return `${DEV_LOG_MARKER}${JSON.stringify(toWireLog(record))}`;
}

function isLogLevel(value: unknown): value is LogLevel {
    return typeof value === 'string' && Object.hasOwn(LEVEL_COLOR, value);
}

function isWireError(value: unknown): value is WireError {
    return (
        isPlainObject(value) &&
        typeof value.name === 'string' &&
        typeof value.message === 'string' &&
        (value.stack === undefined || typeof value.stack === 'string') &&
        (value.cause === undefined || isWireError(value.cause))
    );
}

function isWireArg(value: unknown): value is WireArg {
    if (!isPlainObject(value)) return false;
    return 'error' in value ? isWireError(value.error) : 'value' in value;
}

function isWireArgs(value: unknown): value is WireLogRecord['args'] {
    return value === undefined || (Array.isArray(value) && value.every(isWireArg));
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
