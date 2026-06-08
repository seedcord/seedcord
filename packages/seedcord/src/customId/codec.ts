/* eslint-disable no-magic-numbers -- lots of bigints */

import { SeedcordErrorCode } from '@seedcord/services';
import { SeedcordRangeError } from '@seedcord/services/internal';

import { InvalidCustomId } from './Errors';

import type { CustomIdField, CustomIdShape } from './Field';

// the wire is the routeKey, then a colon, then the body. the routeKey is the stable prefix plus
// a short shape hash, so when the shape changes the routeKey changes and decode catches an old
// wire as stale. the body holds the values. every bounded field (one with a known range) folds
// into a single base64 integer by mixed-radix packing, which is far shorter than one token per
// field. fields that cannot pack (a free string, an int with no bounds) trail the integer as
// delimited tokens. so basically, you get more string per string for your custom id.
//
// works on runtime values (unknown). the typed facade in CustomId.ts guarantees the types.

// url-safe base64, one utf-16 unit per char so discord never rewrites it.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const BASE = 64n;
const CHAR_TO_VALUE = new Map([...ALPHABET].map((char, index) => [char, index] as const));

// unbounded fields trail after the packed block, split by this char and escaped by the next.
const DELIMITER = '\x1f';
const ESCAPE = '\x1b';

/** @internal */
export const HASH_LENGTH = 3;

const SAFE_MAX = BigInt(Number.MAX_SAFE_INTEGER);
const SAFE_MIN = BigInt(Number.MIN_SAFE_INTEGER);

// manual accumulator, never parseInt, which loses precision past 2^53.
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
        if (digit === undefined) throw new InvalidCustomId(`bad character ${JSON.stringify(char)}`);
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
    return text.replace(/[\x1b\x1f]/g, (char) => ESCAPE + char);
}
function unescapeToken(text: string): string {
    let out = '';
    for (let i = 0; i < text.length; i++) {
        if (text.charAt(i) !== ESCAPE) {
            out += text.charAt(i);
            continue;
        }
        const next = text.charAt(i + 1);
        if (next === '') throw new InvalidCustomId('dangling escape at end of token');
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

// bounded means the full range is known, so the field can fold into the shared packed integer.
function isBounded(field: CustomIdField<unknown>): boolean {
    if (field.kind === 'int') return field.min !== undefined && field.max !== undefined;
    return field.kind === 'snowflake' || field.kind === 'uuid' || field.kind === 'bool' || field.kind === 'oneOf';
}

// how many distinct values the field has. mixed-radix packing uses this as the field's base.
function radixOf(field: CustomIdField<unknown>): bigint {
    switch (field.kind) {
        case 'snowflake':
            return 1n << 64n;
        case 'uuid':
            return 1n << 128n;
        case 'bool':
            return 2n;
        case 'oneOf':
            // oneOf() rejects an empty list at define time, so no choices here means a hand-built
            // corrupt shape rather than a real state.
            if (!field.choices?.length) throw new InvalidCustomId('oneOf field has no choices');
            return BigInt(field.choices.length);
        case 'int':
            // isBounded only routes a min-and-max int here, so a missing bound means a corrupt shape.
            if (field.min === undefined || field.max === undefined)
                throw new InvalidCustomId('bounded int field is missing a bound');
            return BigInt(field.max - field.min + 1);
        default:
            throw new InvalidCustomId(`field kind ${field.kind} has no radix`);
    }
}

function boundedToBigint(field: CustomIdField<unknown>, name: string, value: unknown): bigint {
    const slot = boundedSlot(field, name, value);
    // out of range would carry into the neighbouring field on decode.
    if (slot < 0n || slot >= radixOf(field)) outOfRange(name, value);
    return slot;
}

// map a value to its slot, an integer in [0, radix). each kind maps differently.
function boundedSlot(field: CustomIdField<unknown>, name: string, value: unknown): bigint {
    switch (field.kind) {
        case 'snowflake': {
            // a discord id is a non-negative integer string. reject non-strings here so a bad value
            // throws the branded out-of-range error rather than a raw BigInt() TypeError.
            if (typeof value !== 'string' || !/^\d+$/.test(value)) return outOfRange(name, value);
            return BigInt(value);
        }
        case 'uuid': {
            const hex = (value as string).replace(/-/g, '');
            if (!/^[0-9a-fA-F]{32}$/.test(hex)) return outOfRange(name, value);
            return BigInt(`0x${hex}`);
        }
        case 'bool':
            return value ? 1n : 0n;
        case 'oneOf': {
            const index = (field.choices ?? []).indexOf(value as string);
            return index < 0 ? outOfRange(name, value) : BigInt(index);
        }
        case 'int':
            return BigInt((value as number) - (field.min ?? 0));
        default:
            return outOfRange(name, value);
    }
}

function outOfRange(name: string, value: unknown): never {
    throw new SeedcordRangeError(SeedcordErrorCode.CustomIdValueOutOfRange, [name, String(value)]);
}

// inverse of boundedSlot, turn the slot back into the field's value.
function bigintToBoundedValue(field: CustomIdField<unknown>, slot: bigint): unknown {
    switch (field.kind) {
        case 'snowflake':
            return slot.toString();
        case 'uuid':
            return bigintToUuid(slot);
        case 'bool':
            return slot === 1n;
        case 'oneOf':
            return (field.choices ?? [])[Number(slot)];
        case 'int':
            return Number(slot) + (field.min ?? 0);
        default:
            throw new InvalidCustomId(`field kind ${field.kind} is not bounded`);
    }
}

function bigintToUuid(value: bigint): string {
    const hex = value.toString(16).padStart(32, '0');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function encodeUnboundedToken(field: CustomIdField<unknown>, value: unknown): string {
    if (field.kind === 'int') return bigintToBase64(zigzagEncode(value as number));
    return escapeToken(value as string);
}
function decodeUnboundedToken(field: CustomIdField<unknown>, piece: string): unknown {
    if (field.kind !== 'int') return unescapeToken(piece);
    const decoded = zigzagDecode(base64ToBigint(piece));
    // an unbounded int is authored as a js number, so anything past 2^53 was tampered with.
    if (decoded > SAFE_MAX || decoded < SAFE_MIN) throw new InvalidCustomId('integer out of safe range');
    return Number(decoded);
}

/**
 * A short fingerprint of the shape. Change the shape and the hash changes, so an old customId no
 * longer matches the current routeKey and decode catches it as stale.
 *
 * @internal
 */
export function computeLayoutHash(shape: CustomIdShape): string {
    // a structured json signature, never a joined string, so a value holding a separator cannot collide.
    const signature = JSON.stringify(
        Object.entries(shape).map(([name, field]) => [
            name,
            field.kind,
            isBounded(field),
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

/**
 * Pack values into a body. Bounded fields fold into one integer, unbounded fields trail after it.
 *
 * @internal
 */
export function encodeBody(shape: CustomIdShape, values: Record<string, unknown>): string {
    const fields = Object.entries(shape);
    const pieces: string[] = [];

    const bounded = fields.filter(([, field]) => isBounded(field));
    if (bounded.length > 0) {
        let packed = 0n;
        // fold each field in, multiply the running value by the field's radix then add its slot.
        for (const [name, field] of bounded)
            packed = packed * radixOf(field) + boundedToBigint(field, name, values[name]);
        pieces.push(bigintToBase64(packed));
    }
    for (const [name, field] of fields) {
        if (!isBounded(field)) pieces.push(encodeUnboundedToken(field, values[name]));
    }
    return pieces.join(DELIMITER);
}

// unpack the single bounded block back into result, reversing the field order.
function unpackBounded(
    bounded: [string, CustomIdField<unknown>][],
    blob: string | undefined,
    result: Record<string, unknown>
): void {
    // zero packs to one char, so an empty block means the body was truncated.
    if (blob === undefined || blob === '') throw new InvalidCustomId('empty packed block');
    let packed = base64ToBigint(blob);
    // last field packed is the first one back out.
    for (const [name, field] of [...bounded].reverse()) {
        const radix = radixOf(field);
        result[name] = bigintToBoundedValue(field, packed % radix);
        packed /= radix;
    }
    // leftover bits after every field is out means a corrupt block.
    if (packed !== 0n) throw new InvalidCustomId('leftover bits after unpacking');
}

/**
 * Reverse of encodeBody. Rejects any malformed or truncated body.
 *
 * @internal
 */
export function decodeBody(shape: CustomIdShape, body: string): Record<string, unknown> {
    const fields = Object.entries(shape);
    const bounded = fields.filter(([, field]) => isBounded(field));
    const unbounded = fields.filter(([, field]) => !isBounded(field));

    // a shape with no fields encodes to an empty body, so there is nothing to split or unpack.
    const expected = (bounded.length > 0 ? 1 : 0) + unbounded.length;
    if (expected === 0) {
        if (body !== '') throw new InvalidCustomId(`expected an empty body, got ${JSON.stringify(body)}`);
        return {};
    }

    const pieces = splitTokens(body);
    if (pieces.length !== expected) throw new InvalidCustomId(`expected ${expected} piece(s), got ${pieces.length}`);

    const result: Record<string, unknown> = {};
    let cursor = 0;

    if (bounded.length > 0) {
        unpackBounded(bounded, pieces[cursor], result);
        cursor++;
    }

    for (const [name, field] of unbounded) {
        const piece = pieces[cursor];
        cursor++;
        if (piece === undefined) throw new InvalidCustomId('missing trailing piece');
        result[name] = decodeUnboundedToken(field, piece);
    }

    return result;
}
