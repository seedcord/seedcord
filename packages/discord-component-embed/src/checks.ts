import { ComponentEmbedError } from './ComponentEmbedError';

import type { EmbedNode } from './element';
import type { Path } from './tree';

export function describeValue(value: unknown): string {
    if (typeof value === 'bigint') return `${String(value)}n`;
    if (typeof value === 'symbol') return value.toString();
    try {
        // TypeScript types this as string. JSON.stringify returns undefined for a function
        const json = JSON.stringify(value) as string | undefined;
        return json ?? `a ${typeof value}`;
    } catch {
        // JSON.stringify throws on a circular object
        return 'an object';
    }
}

export function messageOf(thrown: unknown): string {
    return Error.isError(thrown) ? thrown.message : describeValue(thrown);
}

export function isIterable(value: unknown): value is Iterable<EmbedNode> {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === 'function'
    );
}

export function checkType(what: string, value: unknown, type: 'boolean' | 'string', path: Path): void {
    if (value !== undefined && typeof value !== type) {
        throw new ComponentEmbedError('InvalidProp', `${what} must be a ${type}, got ${describeValue(value)}.`, {
            path
        });
    }
}

const PREVIEW_LENGTH = 40;

export function checkLength(what: string, value: string, max: number, path: Path): void {
    if (value.length > max) {
        throw new ComponentEmbedError(
            'OverLimit',
            `${what} is ${String(value.length)} characters, ${String(value.length - max)} over Discord's limit of ${String(max)}. It starts with ${describeValue([...value].slice(0, PREVIEW_LENGTH).join(''))}.`,
            { path }
        );
    }
}

export function isFilled(value: string | undefined): value is string {
    return value !== undefined && value !== '';
}

function orList(words: readonly string[]): string {
    const last = words.at(-1) ?? '';
    return words.length > 2 ? `${words.slice(0, -1).join(', ')}, or ${last}` : words.join(' or ');
}

export function checkUrl(what: string, url: string, schemes: readonly string[], max: number, path: Path): void {
    checkType(what, url, 'string', path);
    // URL.parse accepts whitespace by stripping or encoding it
    if (/\s/.test(url)) {
        throw new ComponentEmbedError('InvalidProp', `${what} has whitespace in it, got ${describeValue(url)}.`, {
            path
        });
    }

    const protocol = URL.parse(url)?.protocol;
    if (protocol === undefined || !schemes.includes(protocol)) {
        const names = orList(schemes.map((scheme) => scheme.replace(':', '')));
        throw new ComponentEmbedError('InvalidProp', `${what} must be an ${names} URL, got ${url}.`, { path });
    }

    checkLength(what, url, max, path);
}
