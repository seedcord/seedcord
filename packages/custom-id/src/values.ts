/* eslint-disable no-magic-numbers -- lots of bigints */

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError, SeedcordTypeError } from '@seedcord/errors/internal';

import { invalidError } from './errors';

import type { CustomIdField } from './Field';

// converts one field's value to a bigint and back. codec.ts packs those bigints into the wire.

// codec.ts packs a bounded field into the shared integer since it has a known range
export function isBounded(field: CustomIdField<unknown>): boolean {
    if (field.kind === 'int') return field.min !== undefined && field.max !== undefined;
    return (
        field.kind === 'snowflake' ||
        field.kind === 'uuid' ||
        field.kind === 'bool' ||
        field.kind === 'oneOf' ||
        field.kind === 'someOf'
    );
}

// on a nullable field slot 0 is null and every real value moves up one
export function radixOf(field: CustomIdField<unknown>): bigint {
    return kindRadix(field) + (field.nullable === true ? 1n : 0n);
}

function kindRadix(field: CustomIdField<unknown>): bigint {
    switch (field.kind) {
        case 'snowflake': {
            return 1n << 64n;
        }
        case 'uuid': {
            return 1n << 128n;
        }
        case 'bool': {
            return 2n;
        }
        case 'oneOf': {
            // this only throws for a hand-built shape because oneOf() already rejects an empty list
            if (!field.choices?.length) throw invalidError("oneOf field doesn't have choices");
            return BigInt(field.choices.length);
        }
        case 'someOf': {
            if (!field.choices?.length) throw invalidError("someOf field doesn't have choices");
            return 1n << BigInt(field.choices.length);
        }
        case 'int': {
            // a missing bound means a corrupt shape. isBounded only passes an int with both bounds
            if (field.min === undefined || field.max === undefined)
                throw invalidError('bounded int field is missing a bound');
            // convert first. in float64, max - min + 1 loses the +1 once it reaches 2^53.
            return BigInt(field.max) - BigInt(field.min) + 1n;
        }
        default: {
            throw invalidError(`field kind ${field.kind} doesn't have a radix`);
        }
    }
}

export function boundedToBigint(field: CustomIdField<unknown>, name: string, value: unknown): bigint {
    if (field.nullable === true) {
        if (value === null) return 0n;
        return boundedToBigint({ ...field, nullable: false }, name, value) + 1n;
    }
    const slot = boundedSlot(field, name, value);
    // out of range would carry into the neighbouring field on decode.
    if (slot < 0n || slot >= radixOf(field)) rejectOutOfRange(field, name, value);
    return slot;
}

// check first and throw our own error because BigInt() throws a bare TypeError or SyntaxError on bad input
function snowflakeSlot(field: CustomIdField<unknown>, name: string, value: unknown): bigint {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) return reject(field, name, value);
    return BigInt(value);
}

function uuidSlot(field: CustomIdField<unknown>, name: string, value: unknown): bigint {
    if (typeof value !== 'string') return reject(field, name, value);
    const hex = value.replaceAll('-', '');
    if (!/^[0-9a-fA-F]{32}$/.test(hex)) return reject(field, name, value);
    return BigInt(`0x${hex}`);
}

function someOfSlot(field: CustomIdField<unknown>, name: string, value: unknown): bigint {
    if (!Array.isArray(value)) return reject(field, name, value);
    const choices = field.choices ?? [];
    let mask = 0n;
    for (const picked of value) {
        const index = choices.indexOf(picked as string);
        if (index === -1) return reject(field, name, value);
        mask |= 1n << BigInt(index);
    }
    return mask;
}

// a slot is the value as an integer in [0, radix).
function boundedSlot(field: CustomIdField<unknown>, name: string, value: unknown): bigint {
    switch (field.kind) {
        case 'snowflake': {
            return snowflakeSlot(field, name, value);
        }
        case 'uuid': {
            return uuidSlot(field, name, value);
        }
        case 'bool': {
            if (typeof value !== 'boolean') return reject(field, name, value);
            return value ? 1n : 0n;
        }
        case 'oneOf': {
            const index = (field.choices ?? []).indexOf(value as string);
            return index === -1 ? reject(field, name, value) : BigInt(index);
        }
        case 'someOf': {
            return someOfSlot(field, name, value);
        }
        case 'int': {
            // eslint-disable-next-line unicorn/prefer-number-is-safe-integer -- a bounded int field may declare max up to 2**53 exactly (a power of two, exact in float64)
            if (!Number.isInteger(value)) return reject(field, name, value);
            // subtract in bigint. with a negative min the result can pass 2^53.
            return BigInt(value as number) - BigInt(field.min ?? 0);
        }
        default: {
            return reject(field, name, value);
        }
    }
}

export function reject(field: CustomIdField<unknown>, name: string, value: unknown): never {
    throw new SeedcordTypeError(SeedcordErrorCode.CustomIdValueRejected, [name, expectation(field), show(value)]);
}

export function rejectOutOfRange(field: CustomIdField<unknown>, name: string, value: unknown): never {
    throw new SeedcordRangeError(SeedcordErrorCode.CustomIdValueRejected, [name, expectation(field), show(value)]);
}

// CustomIdValueRejected prints "expects " followed by this
function expectation(field: CustomIdField<unknown>): string {
    switch (field.kind) {
        case 'snowflake': {
            return 'a snowflake string below 2^64';
        }
        case 'uuid': {
            return 'a uuid string';
        }
        case 'bool': {
            return 'a boolean';
        }
        case 'oneOf': {
            return `one of ${listChoices(field)}`;
        }
        case 'someOf': {
            return `an array of values from ${listChoices(field)}`;
        }
        case 'int': {
            if (field.min === undefined || field.max === undefined) return 'a safe integer';
            return `an integer from ${field.min} to ${field.max}`;
        }
        default: {
            return 'a string';
        }
    }
}

function listChoices(field: CustomIdField<unknown>): string {
    return (field.choices ?? []).map((choice) => JSON.stringify(choice)).join(', ');
}

// quote strings so 'false' reads differently from false. stringifying everything would throw on a bigint.
function quote(value: unknown): string {
    return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

function show(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map((entry) => quote(entry)).join(', ')}]`;
    return quote(value);
}

// the reverse of boundedToBigint
export function bigintToBoundedValue(field: CustomIdField<unknown>, slot: bigint): unknown {
    if (field.nullable === true) {
        return slot === 0n ? null : bigintToBoundedValue({ ...field, nullable: false }, slot - 1n);
    }
    return kindValue(field, slot);
}

function kindValue(field: CustomIdField<unknown>, slot: bigint): unknown {
    switch (field.kind) {
        case 'snowflake': {
            return slot.toString();
        }
        case 'uuid': {
            return bigintToUuid(slot);
        }
        case 'bool': {
            return slot === 1n;
        }
        case 'oneOf': {
            return (field.choices ?? [])[Number(slot)];
        }
        case 'someOf': {
            return (field.choices ?? []).filter((_, index) => ((slot >> BigInt(index)) & 1n) === 1n);
        }
        case 'int': {
            const value = slot + BigInt(field.min ?? 0);
            const asNumber = Number(value);
            // 2^53 is a legal max here. a MAX_SAFE_INTEGER check would reject it.
            if (BigInt(asNumber) !== value) throw invalidError('bounded integer out of safe range');
            return asNumber;
        }
        default: {
            throw invalidError(`field kind ${field.kind} is not bounded`);
        }
    }
}

function bigintToUuid(value: bigint): string {
    const hex = value.toString(16).padStart(32, '0');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
