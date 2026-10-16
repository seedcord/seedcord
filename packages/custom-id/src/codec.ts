/* eslint-disable no-magic-numbers -- lots of bigints */

import { invalidError } from './errors';
import { bigintToBoundedValue, boundedToBigint, isBounded, radixOf, reject, rejectOutOfRange } from './values';

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
        // eslint-disable-next-line unicorn/prefer-number-is-safe-integer -- a fraction is the wrong kind, an integer past 2^53 is out of range
        if (!Number.isInteger(value)) reject(field, name, value);
        if (!Number.isSafeInteger(value)) rejectOutOfRange(field, name, value);
        return bigintToBase64(zigzagEncode(value as number));
    }
    if (typeof value !== 'string') return reject(field, name, value);
    return escapeToken(value);
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
            field.choices ?? null,
            field.kind === 'int' ? [field.min ?? null, field.max ?? null] : null
        ])
    );
    const modulus = BASE ** BigInt(HASH_LENGTH);
    let hash = 0n;
    // js stores an emoji as two halves. reading only the first half hashes 1024 emoji to one value.
    for (let i = 0; i < signature.length; i++) hash = (hash * 131n + BigInt(signature.charCodeAt(i))) % modulus;

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
