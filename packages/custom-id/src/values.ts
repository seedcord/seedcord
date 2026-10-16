/* eslint-disable no-magic-numbers -- lots of bigints */

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError, SeedcordTypeError } from '@seedcord/errors/internal';

import { invalidError } from './errors';

import type { CustomIdField } from './Field';

// one field's runtime value as a number and back. codec.ts turns those numbers into the wire string.

// bounded means the full range is known. those fold into the shared packed integer.
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

// slot 0 is the null on a nullable field. every other value shifts up one.
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
            // oneOf() rejects an empty list at define time, so an empty one here came from a
            // hand-built shape.
            if (!field.choices?.length) throw invalidError('oneOf field has no choices');
            return BigInt(field.choices.length);
        }
        case 'someOf': {
            if (!field.choices?.length) throw invalidError('someOf field has no choices');
            // one bit per choice.
            return 1n << BigInt(field.choices.length);
        }
        case 'int': {
            // isBounded only lets a min-and-max int through. a missing bound means the shape is corrupt.
            if (field.min === undefined || field.max === undefined)
                throw invalidError('bounded int field is missing a bound');
            // bigint before the math, max - min + 1 in float64 drops the +1 at 2^53.
            return BigInt(field.max) - BigInt(field.min) + 1n;
        }
        default: {
            throw invalidError(`field kind ${field.kind} has no radix`);
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

// a bad value makes BigInt() throw a bare TypeError or SyntaxError. the guard gets ahead of it with
// the branded error.
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
            // a plain js number cannot hold this subtraction once it passes 2^53.
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

// what the field takes, written to finish the sentence "expects ...".
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

// quoting keeps the string 'false' apart from the boolean. JSON.stringify throws on a bigint.
function quote(value: unknown): string {
    return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

function show(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map((entry) => quote(entry)).join(', ')}]`;
    return quote(value);
}

// inverse of boundedSlot.
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
