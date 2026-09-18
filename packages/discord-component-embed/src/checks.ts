import { ComponentEmbedError } from './ComponentEmbedError';

export function checkType(what: string, value: unknown, type: 'boolean' | 'string'): void {
    if (value !== undefined && typeof value !== type) {
        throw new ComponentEmbedError(`${what} must be a ${type}, got ${JSON.stringify(value)}.`);
    }
}

export function checkLength(what: string, value: string, max: number): void {
    if (value.length > max) {
        throw new ComponentEmbedError(`${what} is longer than ${String(max)} characters (${String(value.length)}).`);
    }
}

export function hasScheme(url: string, schemes: readonly string[]): boolean {
    const protocol = URL.parse(url)?.protocol;
    return protocol !== undefined && schemes.includes(protocol);
}

// URL.parse ignores whitespace that the raw url still carries
export function checkNoWhitespace(what: string, url: string): void {
    if (/\s/.test(url)) throw new ComponentEmbedError(`${what} has whitespace in it, got ${JSON.stringify(url)}.`);
}
