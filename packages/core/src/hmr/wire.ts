import { filterCirculars } from '@seedcord/utils';

import type { LogRecord } from '@seedcord/types';
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

export function toWireLog({ args, ...record }: LogRecord): WireLogRecord {
    return { ...record, args: args?.map(toWireArg) };
}

export function fromWireLog({ args, ...record }: WireLogRecord): LogRecord {
    return args ? { ...record, args: args.map(fromWireArg) } : record;
}

// miniflare prints the worker's console output through vite's logger, where seedcord dev reads it back
const DEV_LOG_MARKER = 'seedcord:log ';

export function toDevLogLine(record: LogRecord): string {
    return `${DEV_LOG_MARKER}${JSON.stringify(toWireLog(record))}`;
}

export function fromDevLogLine(line: string): LogRecord | undefined {
    const at = line.indexOf(DEV_LOG_MARKER);
    if (at === -1) return undefined;
    // justified: toDevLogLine wrote everything after the marker
    return fromWireLog(JSON.parse(line.slice(at + DEV_LOG_MARKER.length)) as WireLogRecord);
}
