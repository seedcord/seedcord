/* eslint-disable no-magic-numbers -- lots of bigints */

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError } from '@seedcord/errors/internal';

import { invalidError } from './errors';

import type { CustomIdField, CustomIdShape } from './Field';

// wire is routeKey, a colon, then the body. the routeKey is the stable prefix plus a short shape
// hash, which is how decode rejects a wire minted under an older shape. bounded fields (known range)
// fold into one base64 integer by mixed-radix packing. unbounded ones (free string, unbounded int)
// trail it as delimited tokens.
//
// everything here works on runtime values (unknown). CustomId.ts adds the typed layer.

// url-safe base64, one utf-16 unit per char so encode's wire.length cap counts chars exactly.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const BASE = 64n;
const CHAR_TO_VALUE = new Map([...ALPHABET].map((char, index) => [char, index] as const));

const DELIMITER = '\u{1F}';
const ESCAPE = '\u{1B}';

/** @internal */
export const HASH_LENGTH = 3;

const SAFE_MAX = BigInt(Number.MAX_SAFE_INTEGER);
const SAFE_MIN = BigInt(Number.MIN_SAFE_INTEGER);

// toString and parseInt top out at base 36, and float64 loses integers past 2^53.
function bigintToBase64(value: bigint): string {
    if (value === 0n) return ALPHABET.charAt(0);
    let text = '';
    for (let remaining = value; remaining > 0n; remaining /= BASE) {
        text = ALPHABET.charAt(Number(remaining % BASE)) + text;
    }
    return text;
}

function base64ToBigint(text: string): bigint {
    let value = 0n;
    for (const char of text) {
        const digit = CHAR_TO_VALUE.get(char);
        if (digit === undefined) throw invalidError(`bad character ${JSON.stringify(char)}`);
        value = value * BASE + BigInt(digit);
    }
    return value;
}

// zigzag keeps a small negative number short on the wire.
function zigzagEncode(value: number): bigint {
    const big = BigInt(value);
    return big >= 0n ? big << 1n : (-big << 1n) - 1n;
}
function zigzagDecode(encoded: bigint): bigint {
    return (encoded & 1n) === 1n ? -((encoded + 1n) >> 1n) : encoded >> 1n;
}

function escapeToken(text: string): string {
    return text.replaceAll(/[\x1B\x1F]/g, (char) => ESCAPE + char);
}
function unescapeToken(text: string): string {
    let out = '';
    for (let i = 0; i < text.length; i++) {
        if (text.charAt(i) !== ESCAPE) {
            out += text.charAt(i);
            continue;
        }
        const next = text.charAt(i + 1);
        if (next === '') throw invalidError('dangling escape at end of token');
        out += next;
        i++;
    }
    return out;
}
function splitTokens(body: string): string[] {
    const pieces: string[] = [];
    let current = '';
    for (let i = 0; i < body.length; i++) {
        const char = body.charAt(i);
        if (char === ESCAPE) {
            current += char + body.charAt(i + 1);
            i++;
        } else if (char === DELIMITER) {
            pieces.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    pieces.push(current);
    return pieces;
}

// bounded means the full range is known. those fold into the shared packed integer.
function isBounded(field: CustomIdField<unknown>): boolean {
    if (field.kind === 'int') return field.min !== undefined && field.max !== undefined;
    return field.kind === 'snowflake' || field.kind === 'uuid' || field.kind === 'bool' || field.kind === 'oneOf';
}

// slot 0 is the null on a nullable field. every other value shifts up one.
function radixOf(field: CustomIdField<unknown>): bigint {
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

function boundedToBigint(field: CustomIdField<unknown>, name: string, value: unknown): bigint {
    if (field.nullable === true) {
        if (value === null) return 0n;
        return boundedToBigint({ ...field, nullable: false }, name, value) + 1n;
    }
    const slot = boundedSlot(field, name, value);
    // out of range would carry into the neighbouring field on decode.
    if (slot < 0n || slot >= radixOf(field)) outOfRange(name, value);
    return slot;
}

// a slot is the value as an integer in [0, radix).
function boundedSlot(field: CustomIdField<unknown>, name: string, value: unknown): bigint {
    switch (field.kind) {
        case 'snowflake': {
            // a bad value makes BigInt() throw a bare TypeError or SyntaxError. the guard gets
            // ahead of it with the branded error.
            if (typeof value !== 'string' || !/^\d+$/.test(value)) return outOfRange(name, value);
            return BigInt(value);
        }
        case 'uuid': {
            if (typeof value !== 'string') return outOfRange(name, value);
            const hex = value.replaceAll('-', '');
            if (!/^[0-9a-fA-F]{32}$/.test(hex)) return outOfRange(name, value);
            return BigInt(`0x${hex}`);
        }
        case 'bool': {
            return value ? 1n : 0n;
        }
        case 'oneOf': {
            const index = (field.choices ?? []).indexOf(value as string);
            return index === -1 ? outOfRange(name, value) : BigInt(index);
        }
        case 'int': {
            // eslint-disable-next-line unicorn/prefer-number-is-safe-integer -- a bounded int field may declare max up to 2**53 exactly (a power of two, exact in float64)
            if (!Number.isInteger(value)) return outOfRange(name, value);
            return BigInt((value as number) - (field.min ?? 0));
        }
        default: {
            return outOfRange(name, value);
        }
    }
}

function outOfRange(name: string, value: unknown): never {
    throw new SeedcordRangeError(SeedcordErrorCode.CustomIdValueOutOfRange, [name, String(value)]);
}

// inverse of boundedSlot.
function bigintToBoundedValue(field: CustomIdField<unknown>, slot: bigint): unknown {
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
        case 'int': {
            return Number(slot) + (field.min ?? 0);
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

// an unbounded field trails as its own token, where an empty string is already a legal str value. a
// nullable one carries one leading char to tell the two apart.
const ABSENT = '0';
const PRESENT = '1';

function encodeUnboundedToken(field: CustomIdField<unknown>, name: string, value: unknown): string {
    if (field.nullable === true) {
        if (value === null) return ABSENT;
        return PRESENT + encodeUnboundedToken({ ...field, nullable: false }, name, value);
    }
    if (field.kind === 'int') {
        if (!Number.isSafeInteger(value)) outOfRange(name, value);
        return bigintToBase64(zigzagEncode(value as number));
    }
    return escapeToken(value as string);
}
function decodeUnboundedToken(field: CustomIdField<unknown>, piece: string): unknown {
    if (field.nullable === true) {
        const marker = piece.charAt(0);
        if (marker === ABSENT && piece.length === 1) return null;
        if (marker !== PRESENT) throw invalidError(`bad presence marker ${JSON.stringify(marker)}`);
        return decodeUnboundedToken({ ...field, nullable: false }, piece.slice(1));
    }
    if (field.kind !== 'int') return unescapeToken(piece);
    // an empty piece means a truncated wire
    if (piece === '') throw invalidError('empty integer token');
    const decoded = zigzagDecode(base64ToBigint(piece));
    // encode only ever takes a js number. anything past 2^53 came from somewhere else.
    if (decoded > SAFE_MAX || decoded < SAFE_MIN) throw invalidError('integer out of safe range');
    return Number(decoded);
}

/** @internal */
export function computeLayoutHash(shape: CustomIdShape): string {
    // stringify escapes the choice strings. two different shapes cannot produce the same signature.
    const signature = JSON.stringify(
        Object.entries(shape).map(([name, field]) => [
            name,
            field.kind,
            isBounded(field),
            field.nullable === true,
            field.kind === 'oneOf' ? (field.choices ?? []) : null,
            field.kind === 'int' ? [field.min ?? null, field.max ?? null] : null
        ])
    );
    const modulus = BASE ** BigInt(HASH_LENGTH);
    let hash = 0n;
    for (const char of signature) hash = (hash * 131n + BigInt(char.charCodeAt(0))) % modulus;

    let text = '';
    for (let i = 0; i < HASH_LENGTH; i++) {
        text = ALPHABET.charAt(Number(hash % BASE)) + text;
        hash /= BASE;
    }
    return text;
}

/** @internal */
export function encodeBody(shape: CustomIdShape, values: Record<string, unknown>): string {
    const fields = Object.entries(shape);
    const pieces: string[] = [];

    const bounded = fields.filter(([, field]) => isBounded(field));
    if (bounded.length > 0) {
        let packed = 0n;
        for (const [name, field] of bounded)
            packed = packed * radixOf(field) + boundedToBigint(field, name, values[name]);
        pieces.push(bigintToBase64(packed));
    }
    for (const [name, field] of fields) {
        if (!isBounded(field)) pieces.push(encodeUnboundedToken(field, name, values[name]));
    }
    return pieces.join(DELIMITER);
}

function unpackBounded(
    bounded: [string, CustomIdField<unknown>][],
    blob: string | undefined,
    result: Record<string, unknown>
): void {
    // zero still packs to one char. an empty block means the body was cut short.
    if (blob === undefined || blob === '') throw invalidError('empty packed block');
    let packed = base64ToBigint(blob);
    // last field packed is the first one back out.
    for (const [name, field] of [...bounded].reverse()) {
        const radix = radixOf(field);
        result[name] = bigintToBoundedValue(field, packed % radix);
        packed /= radix;
    }
    if (packed !== 0n) throw invalidError('leftover bits after unpacking');
}

/** @internal */
export function decodeBody(shape: CustomIdShape, body: string): Record<string, unknown> {
    const fields = Object.entries(shape);
    const bounded = fields.filter(([, field]) => isBounded(field));
    const unbounded = fields.filter(([, field]) => !isBounded(field));

    // a shape with no fields encodes to an empty body.
    const expected = (bounded.length > 0 ? 1 : 0) + unbounded.length;
    if (expected === 0) {
        if (body !== '') throw invalidError(`expected an empty body, got ${JSON.stringify(body)}`);
        return {};
    }

    const pieces = splitTokens(body);
    if (pieces.length !== expected) throw invalidError(`expected ${expected} piece(s), got ${pieces.length}`);

    const result: Record<string, unknown> = {};
    let cursor = 0;

    if (bounded.length > 0) {
        unpackBounded(bounded, pieces[cursor], result);
        cursor++;
    }

    for (const [name, field] of unbounded) {
        const piece = pieces[cursor];
        cursor++;
        if (piece === undefined) throw invalidError('missing trailing piece');
        result[name] = decodeUnboundedToken(field, piece);
    }

    return result;
}
