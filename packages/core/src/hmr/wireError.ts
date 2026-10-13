import { asError } from '@seedcord/utils/internal';

import type { WireError } from '@seedcord/types/internal';

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
