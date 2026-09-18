import { ComponentEmbedError } from './ComponentEmbedError';

import type { ReactNode } from 'react';

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

export function isIterable(value: unknown): value is Iterable<ReactNode> {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === 'function'
    );
}

export function checkType(what: string, value: unknown, type: 'boolean' | 'string'): void {
    if (value !== undefined && typeof value !== type) {
        throw new ComponentEmbedError('InvalidProp', `${what} must be a ${type}, got ${describeValue(value)}.`);
    }
}

export function checkLength(what: string, value: string, max: number): void {
    if (value.length > max) {
        throw new ComponentEmbedError(
            'OverLimit',
            `${what} is longer than ${String(max)} characters (${String(value.length)}).`
        );
    }
}

export function hasScheme(url: string, schemes: readonly string[]): boolean {
    const protocol = URL.parse(url)?.protocol;
    return protocol !== undefined && schemes.includes(protocol);
}

// URL.parse ignores whitespace that the raw url still carries
export function checkNoWhitespace(what: string, url: string): void {
    if (/\s/.test(url)) {
        throw new ComponentEmbedError('InvalidProp', `${what} has whitespace in it, got ${describeValue(url)}.`);
    }
}
