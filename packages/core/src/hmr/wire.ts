import { filterCirculars } from '@seedcord/utils';
import { asError } from '@seedcord/utils/internal';

import type { LogRecord } from '@seedcord/types';
import type { WireError, WireLogRecord } from '@seedcord/types/internal';

type WireArg = NonNullable<WireLogRecord['args']>[number];

export function toWireError(thrown: unknown): WireError {
    const error = asError(thrown);
    return { name: error.name, message: error.message, stack: error.stack, code: Reflect.get(error, 'code') };
}

export function fromWireError({ name, message, stack, code }: WireError): Error {
    const error = new Error(message);
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
