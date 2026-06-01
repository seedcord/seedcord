import { ExcerptTokenKind } from '@microsoft/api-extractor-model';

import { referenceFromCanonical } from './canonical-ref';

import type { InlineType, SigPart } from '../types';
import type { Excerpt, ExcerptToken } from '@microsoft/api-extractor-model';

// Intrinsic / global type keywords. The TypeDoc renderer emitted these as `ref` parts so the
// consumer's resolveHref can link them to MDN / the TS handbook; API Extractor flattens them into
// plain Content text, so we re-wrap them here to preserve that linking behaviour.
const INTRINSICS = new Set([
    'string',
    'number',
    'boolean',
    'bigint',
    'symbol',
    'void',
    'undefined',
    'null',
    'never',
    'unknown',
    'any',
    'object',
    'this'
]);

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const textPart = (text: string): SigPart => ({ kind: 'text', text });
const punctPart = (text: string): SigPart => ({ kind: 'punct', text });

/**
 * Split a Content run into text / punct / space parts. Identifier runs that name an intrinsic become
 * `ref` parts (so they link like the TypeDoc path did); other identifiers stay text. Runs of
 * whitespace collapse to a single `space` part, matching the old renderer's spacing.
 */
function tokenizeContent(text: string, parts: SigPart[]): void {
    let buffer = '';
    let mode: 'word' | 'punct' | null = null;

    const flush = (): void => {
        if (!buffer) return;
        if (mode === 'word') {
            if (INTRINSICS.has(buffer)) parts.push({ kind: 'ref', text: buffer, ref: { name: buffer } });
            else parts.push(textPart(buffer));
        } else {
            parts.push(punctPart(buffer));
        }
        buffer = '';
        mode = null;
    };

    for (const char of text) {
        if (/\s/.test(char)) {
            flush();
            if (parts[parts.length - 1]?.kind !== 'space') parts.push({ kind: 'space' });
            continue;
        }
        const charMode = IDENTIFIER.test(char) || char === '.' ? 'word' : 'punct';
        // keep dotted names (e.g. `Stream.Writable`) as one word run
        if (mode && mode !== charMode) flush();
        mode = charMode;
        buffer += char;
    }
    flush();
}

export function tokensToSigParts(tokens: readonly ExcerptToken[]): SigPart[] {
    const parts: SigPart[] = [];
    for (const token of tokens) {
        if (token.kind === ExcerptTokenKind.Reference && token.canonicalReference) {
            // AE appends a `$N` disambiguation suffix when two same-named symbols are in scope
            // (e.g. winston `Logger` vs a package `Logger` -> `Logger$1`). Strip it from the
            // displayed name only; `ref.name` stays byte-exact so it doesn't collide with a
            // documented same-named node during the resolver's name fallback.
            parts.push({
                kind: 'ref',
                text: token.text.replace(/\$\d+$/, ''),
                ref: referenceFromCanonical(token.canonicalReference, token.text)
            });
            continue;
        }
        tokenizeContent(token.text, parts);
    }
    return parts;
}

export function excerptToInlineType(excerpt: Excerpt | undefined): InlineType | undefined {
    if (!excerpt) return undefined;
    const trimmed = excerpt.text.trim();
    if (trimmed.length === 0) return undefined;
    const parts = tokensToSigParts(excerpt.spannedTokens);
    return parts.length > 0 ? { parts } : undefined;
}
