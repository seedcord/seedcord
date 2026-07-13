import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

// shapeshift aggregate errors nest, the cap stops a cyclic or deep tree from looping
const MAX_DEPTH = 8;

interface ShapeshiftLike {
    readonly message?: unknown;
    readonly errors?: unknown;
    readonly constraint?: unknown;
    readonly validator?: unknown;
    readonly expected?: unknown;
    readonly given?: unknown;
}

const OPERATOR_WORD: Record<string, string> = {
    '<=': 'at most',
    '>=': 'at least',
    '<': 'fewer than',
    '>': 'more than'
};

const KIND_WORD: Record<string, string> = {
    string: 'a string',
    number: 'a number',
    boolean: 'a boolean',
    bigint: 'a bigint',
    array: 'a list',
    tuple: 'a list',
    date: 'a date',
    object: 'an object'
};

function asRecord(value: unknown): ShapeshiftLike | null {
    return typeof value === 'object' && value !== null ? value : null;
}

function firstLine(message: unknown): string {
    if (typeof message !== 'string') return 'unknown validation failure';
    return message.split('\n')[0] ?? message;
}

// longer strings read better as a size than a quoted dump
const GIVEN_PREVIEW_LIMIT = 40;

function gotPhrase(given: unknown): string {
    if (given === undefined) return 'nothing';
    if (given === null) return 'null';
    if (typeof given === 'string') {
        if (given.length === 0) return 'an empty string';
        if (given.length > GIVEN_PREVIEW_LIMIT) return `${given.length} characters`;
        return JSON.stringify(given);
    }
    if (Array.isArray(given)) return given.length === 0 ? 'an empty list' : `${given.length} items`;
    if (typeof given === 'number' || typeof given === 'bigint' || typeof given === 'boolean') return String(given);
    if (typeof given === 'object') return given.constructor.name;
    return typeof given;
}

// shapeshift phrases bounds as 'expected.length >= 1' or 'expected <= 16777215'
function needPhrase(expected: string, given: unknown): string | null {
    const bounds = [...expected.matchAll(/expected(\.length)?\s*(<=|>=|<|>)\s*(\d+)/g)];
    if (bounds.length === 0) return null;
    const phrases = bounds.map(([, lengthPart, operator, limit]) => {
        const word = OPERATOR_WORD[operator ?? ''] ?? operator;
        if (!lengthPart) return `${word} ${limit}`;
        const unit = typeof given === 'string' ? 'character' : 'item';
        return `${word} ${limit} ${Number(limit) === 1 ? unit : `${unit}s`}`;
    });
    return phrases.join(' and ');
}

function instanceName(expected: unknown): string {
    if (typeof expected === 'function' && expected.name) return expected.name;
    return 'specific class instance';
}

function describeLeaf(record: ShapeshiftLike): string {
    if (typeof record.constraint === 'string') {
        const need = typeof record.expected === 'string' ? needPhrase(record.expected, record.given) : null;
        if (need) return `need ${need}, got ${gotPhrase(record.given)}`;
        return `${firstLine(record.message)}${'given' in record ? ` (got ${gotPhrase(record.given)})` : ''}`;
    }
    if (typeof record.expected === 'function') {
        return `need a ${instanceName(record.expected)}, got ${gotPhrase(record.given)}`;
    }
    if (typeof record.validator === 'string') {
        const kind = KIND_WORD[record.validator.replace(/^s\./, '').replace(/\(.*$/, '')];
        if (kind) return `need ${kind}, got ${gotPhrase(record.given)}`;
        return `${firstLine(record.message)}, got ${gotPhrase(record.given)}`;
    }
    return firstLine(record.message);
}

// prefer the branch a dev can act on, a concrete bound or the accepted classes
function describeUnion(branches: unknown[], depth: number): string {
    const records: ShapeshiftLike[] = [];
    for (const branch of branches) {
        const record = asRecord(branch);
        if (record) records.push(record);
    }
    const bounded = records.find((record) => typeof record.constraint === 'string');
    if (bounded) return describeLeaf(bounded);

    const names: string[] = [];
    let allInstances = records.length > 0;
    for (const record of records) {
        if (typeof record.expected === 'function') names.push(instanceName(record.expected));
        else allInstances = false;
    }
    if (allInstances) {
        return `need a ${[...new Set(names)].join(' or ')}, got ${gotPhrase(records[0]?.given)}`;
    }
    return detailOf(branches[0], depth + 1);
}

// shapeshift nests errors as [key, inner] tuples
function detailOf(value: unknown, depth: number): string {
    const record = asRecord(value);
    if (!record || depth >= MAX_DEPTH) return firstLine(record?.message);

    if (Array.isArray(record.errors) && record.errors.length > 0) {
        const errors = record.errors as unknown[];
        const [first] = errors;
        if (Array.isArray(first)) {
            const [key, inner] = first as [unknown, unknown];
            return `${String(key)}: ${detailOf(inner, depth + 1)}`;
        }
        return describeUnion(errors, depth);
    }

    return describeLeaf(record);
}

/**
 * A shapeshift throw renders as need-versus-got with its failing property path. Any other throw passes
 * through with its message as the detail. The original error is kept as `cause`.
 */
export function translateSerializationError(
    error: unknown,
    componentClass: string,
    index: number,
    routeId: string
): SeedcordError<SeedcordErrorCode.ReplyComponentSerialization> {
    const detail = detailOf(error, 0);
    return new SeedcordError(SeedcordErrorCode.ReplyComponentSerialization, [componentClass, index, detail, routeId], {
        cause: error
    });
}
