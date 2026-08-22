import { ExcerptTokenKind } from '@microsoft/api-extractor-model';

import { referenceFromCanonical } from '#model/canonical-ref';

import type { InlineType, SigPart } from '#src/types';
import type { Excerpt, ExcerptToken } from '@microsoft/api-extractor-model';

// api extractor flattens these into plain Content text, so re-wrap them as `ref` parts to keep the
// consumer's resolveHref linking them to MDN and the TS handbook
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

const QUOTES = new Set(["'", '"']);

// a string literal type spells `'any'` with the same letters as the intrinsic
function literalAt(text: string, start: number): string | null {
    const quote = text.charAt(start);
    if (!QUOTES.has(quote)) return null;

    const close = text.indexOf(quote, start + 1);

    return text.slice(start, close === -1 ? text.length : close + 1);
}

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

    for (let index = 0; index < text.length; index++) {
        const literal = literalAt(text, index);
        if (literal) {
            flush();
            parts.push(punctPart(literal));
            index += literal.length - 1;
            continue;
        }

        const char = text.charAt(index);
        if (/\s/.test(char)) {
            flush();
            if (parts.at(-1)?.kind !== 'space') parts.push({ kind: 'space' });
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
            // AE appends `$N` when two same-named symbols are in scope (winston `Logger` alongside a
            // package `Logger` becomes `Logger$1`). strip it from the display text only. `ref.name` stays
            // byte-exact so the resolver's name fallback never collides with a documented same-named node.
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
